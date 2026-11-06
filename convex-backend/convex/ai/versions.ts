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

/** Newest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("versions").withIndex("by_publishedAt").order("desc").take(100);
    return rows.map((r) => ({
      id: r._id,
      summary: r.summary,
      records: r.contentSnapshot.length,
      publishedAt: r.publishedAt,
      isRollback: !!r.revertOf,
      rolledBack: !!r.revertedBy,
    }));
  },
});

export const rollback = mutation({
  args: { versionId: v.id("versions") },
  handler: async (ctx, { versionId }) => {
    const userId = await requireAdmin(ctx);
    const version = await ctx.db.get(versionId);
    if (!version) throw new ConvexError("That version no longer exists.");
    if (version.revertedBy) throw new ConvexError("This version has already been rolled back.");
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
      summary: `Rolled back: ${version.summary}`.slice(0, 500),
      contentSnapshot,
      revertOf: versionId,
      publishedBy: userId,
      publishedAt: Date.now(),
    });
    await ctx.db.patch(versionId, { revertedBy: newVersion });
    await audit(ctx, { userId, changeSetId: version.changeSetId, action: "rollback", detail: { versionId, newVersion } });
  },
});
