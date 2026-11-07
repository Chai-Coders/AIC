// History and rollback. A rollback is itself a new version, so it can be rolled
// back too, and it refuses to overwrite anything changed after the publish.
import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import type { ContentTable } from "../schema";
import { requireAdmin } from "../lib/access";
import { audit } from "./audit";
import { writeSiteText } from "./publish";
import { sameValue } from "./records";

const SYSTEM = new Set(["_id", "_creationTime"]);
const fieldsOf = (doc: Record<string, unknown>) => Object.keys(doc).filter((k) => !SYSTEM.has(k));
const contentOf = (doc: Record<string, unknown>) => Object.fromEntries(fieldsOf(doc).map((k) => [k, doc[k]]));

/** The fields a publish actually changed on a record. */
function changedFields(before: Record<string, unknown>, after: Record<string, unknown>) {
  return [...new Set([...fieldsOf(before), ...fieldsOf(after)])].filter((k) => !sameValue(before[k], after[k]));
}

async function rollbackConflicts(ctx: QueryCtx, version: Doc<"versions">) {
  const conflicts: string[] = [];
  for (const { table, id, before, after } of version.contentSnapshot) {
    if (table === "siteText") {
      const row = await ctx.db.query("siteText").withIndex("by_key", (q) => q.eq("key", id)).unique();
      if ((row?.value ?? null) !== (after?.value ?? null)) conflicts.push(`the website text ${id} changed after this publish`);
      continue;
    }
    const docId = ctx.db.normalizeId(table, id);
    const current = docId ? ((await ctx.db.get(docId)) as Record<string, unknown> | null) : null;
    if (after === null) {
      // It was deleted by this publish, so restoring it can't overwrite anything.
      continue;
    }
    if (!current) {
      if (before !== null) conflicts.push(`a ${table} record has since been deleted`);
      continue;
    }
    const fields = before === null ? fieldsOf(after) : changedFields(before, after);
    const edited = fields.filter((f) => !sameValue(current[f], after[f]));
    if (edited.length) conflicts.push(`${edited.join(", ")} on a ${table} record changed after this publish`);
  }
  return conflicts;
}

/**
 * A publish, its rollback, the undo of that rollback, and so on form a chain. Every
 * other step takes the change off the site, so a version's place in the chain says
 * what it did, and the last step says where things stand now.
 */
async function chainOf(ctx: QueryCtx, version: Doc<"versions">) {
  let root = version;
  let depth = 0;
  while (root.revertOf) {
    const parent = await ctx.db.get(root.revertOf);
    if (!parent) break;
    root = parent;
    depth += 1;
  }
  let lastDepth = depth;
  for (let row: Doc<"versions"> | null = version; row?.revertedBy; lastDepth += 1) row = await ctx.db.get(row.revertedBy);
  return { root, depth, takesItOff: depth % 2 === 1, isOffNow: lastDepth % 2 === 1, isLast: !version.revertedBy };
}

const rollbackSummary = (rootSummary: string) => `Rolled back: ${rootSummary}`;
const putBackSummary = (rootSummary: string) => `Put back: ${rootSummary}`;

function statusOf(chain: Awaited<ReturnType<typeof chainOf>>) {
  if (chain.takesItOff) return chain.isLast ? "Rollback in effect" : "Undone";
  if (chain.isLast) return chain.depth === 0 ? "Live" : "Live again";
  return chain.isOffNow ? "Rolled back" : "Put back later";
}

/** Newest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("versions").withIndex("by_publishedAt").order("desc").take(100);
    return await Promise.all(
      rows.map(async (r) => {
        const chain = await chainOf(ctx, r);
        const about = chain.root.summary;
        return {
          id: r._id,
          // Worked out here so older rows read properly too.
          summary: chain.depth === 0 ? about : chain.takesItOff ? rollbackSummary(about) : putBackSummary(about),
          about,
          records: r.contentSnapshot.length,
          publishedAt: r.publishedAt,
          isRollback: chain.takesItOff,
          rolledBack: !!r.revertedBy,
          status: statusOf(chain),
        };
      }),
    );
  },
});

export const rollback = mutation({
  args: { versionId: v.id("versions") },
  handler: async (ctx, { versionId }) => {
    const userId = await requireAdmin(ctx);
    const version = await ctx.db.get(versionId);
    if (!version) throw new ConvexError("That version no longer exists.");
    const chain = await chainOf(ctx, version);
    if (version.revertedBy) {
      throw new ConvexError(chain.takesItOff ? "This rollback has already been undone." : "This version has already been rolled back.");
    }
    const conflicts = await rollbackConflicts(ctx, version);
    if (conflicts.length) {
      throw new ConvexError(`This can't be rolled back automatically: ${conflicts.join("; ")}. Nothing was changed.`);
    }

    const contentSnapshot = [];
    for (const { table, id, before, after } of version.contentSnapshot as { table: ContentTable | "siteText"; id: string; before: any; after: any }[]) {
      if (table === "siteText") {
        contentSnapshot.push({ table, id, before: after, after: await writeSiteText(ctx, id, before?.value ?? null) });
        continue;
      }
      const docId = ctx.db.normalizeId(table, id);
      if (after === null) {
        const newId = await ctx.db.insert(table, contentOf(before) as any);
        contentSnapshot.push({ table, id: newId, before: null, after: await ctx.db.get(newId) });
      } else if (before === null) {
        const current = docId ? await ctx.db.get(docId) : null;
        if (current) await ctx.db.delete(docId!);
        contentSnapshot.push({ table, id, before: current, after: null });
      } else {
        const current = (await ctx.db.get(docId!))!;
        const patch = Object.fromEntries(changedFields(before, after).map((f) => [f, before[f]]));
        await ctx.db.patch(docId!, patch as any);
        contentSnapshot.push({ table, id, before: current, after: await ctx.db.get(docId!) });
      }
    }

    const newVersion = await ctx.db.insert("versions", {
      changeSetId: version.changeSetId,
      kind: "content",
      summary: (chain.takesItOff ? putBackSummary(chain.root.summary) : rollbackSummary(chain.root.summary)).slice(0, 500),
      contentSnapshot,
      revertOf: versionId,
      publishedBy: userId,
      publishedAt: Date.now(),
    });
    await ctx.db.patch(versionId, { revertedBy: newVersion });
    await audit(ctx, { userId, changeSetId: version.changeSetId, action: chain.takesItOff ? "rollback.undo" : "rollback", detail: { versionId, newVersion } });
    return { undidRollback: chain.takesItOff };
  },
});
