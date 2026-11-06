// History and rollback. A rollback is itself a new version, so it can be rolled
// back too, and it refuses to overwrite anything changed after the publish.
import { ConvexError, v } from "convex/values";
import { action, internalMutation, internalQuery, query, type QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ContentTable } from "../schema";
import { requireAdmin } from "../lib/access";
import { audit } from "./audit";
import { blobText, branchHead, changedSince, commitFiles, commitTree, safeCommitMessage } from "./github";
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

export const getInternal = internalQuery({
  args: { versionId: v.id("versions") },
  handler: async (ctx, { versionId }) => await ctx.db.get(versionId),
});

/** Newest first, without file contents. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("versions").withIndex("by_publishedAt").order("desc").take(100);
    return rows.map((r) => ({
      id: r._id,
      kind: r.kind,
      summary: r.summary,
      commitSha: r.commitSha ?? null,
      files: (r.files ?? []).map((f) => f.path),
      records: r.contentSnapshot.length,
      status: r.status,
      error: r.error ?? null,
      publishedAt: r.publishedAt,
      isRollback: !!r.revertOf,
      rolledBack: !!r.revertedBy,
    }));
  },
});

export const prepareRollback = internalQuery({
  args: { versionId: v.id("versions") },
  handler: async (ctx, { versionId }) => {
    const version = await ctx.db.get(versionId);
    if (!version) throw new ConvexError("That version no longer exists.");
    if (version.revertedBy) throw new ConvexError("This version has already been rolled back.");
    if (version.status === "content_pending") throw new ConvexError("This version is still publishing.");
    const conflicts = await rollbackConflicts(ctx, version);
    if (conflicts.length) {
      throw new ConvexError(`This can't be rolled back automatically: ${conflicts.join("; ")}. Nothing was changed.`);
    }
    return version;
  },
});

export const finishRollback = internalMutation({
  args: {
    userId: v.id("users"),
    versionId: v.id("versions"),
    commitSha: v.optional(v.string()),
    parentCommitSha: v.optional(v.string()),
    files: v.optional(v.array(v.object({ path: v.string(), before: v.union(v.string(), v.null()) }))),
  },
  handler: async (ctx, { userId, versionId, commitSha, parentCommitSha, files }): Promise<Id<"versions">> => {
    const version = (await ctx.db.get(versionId))!;
    const conflicts = await rollbackConflicts(ctx, version);
    if (conflicts.length) throw new ConvexError(`The content couldn't be restored: ${conflicts.join("; ")}.`);

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
      kind: version.kind,
      summary: `Rolled back: ${version.summary}`.slice(0, 500),
      contentSnapshot,
      commitSha,
      parentCommitSha,
      files,
      revertOf: versionId,
      status: "ok",
      publishedBy: userId,
      publishedAt: Date.now(),
    });
    await ctx.db.patch(versionId, { revertedBy: newVersion });
    await audit(ctx, { userId, changeSetId: version.changeSetId, action: "rollback", detail: { versionId, newVersion, commitSha } });
    return newVersion;
  },
});

export const rollback = action({
  args: { versionId: v.id("versions") },
  handler: async (ctx, { versionId }): Promise<void> => {
    const userId = await requireAdmin(ctx);
    const version: Doc<"versions"> = await ctx.runQuery(internal.ai.versions.prepareRollback, { versionId });
    let code: { commitSha: string; parentCommitSha: string; files: { path: string; before: string | null }[] } | undefined;
    if (version.commitSha && version.files?.length) {
      const head = await branchHead();
      const changed = await changedSince(version.commitSha, head);
      const touched = version.files.map((f) => f.path).filter((p) => changed.includes(p));
      if (touched.length) {
        throw new ConvexError(`These files changed after this publish, so it can't be rolled back automatically: ${touched.join(", ")}. Nothing was changed.`);
      }
      const { entries } = await commitTree(head);
      const shas = new Map(entries.map((e) => [e.path, e.sha]));
      const files = await Promise.all(
        version.files.map(async (f) => {
          const sha = shas.get(f.path);
          return { path: f.path, before: sha ? await blobText(sha) : null };
        }),
      );
      const commitSha = await commitFiles({
        parentSha: head,
        message: safeCommitMessage(`AI Assistant: roll back "${version.summary.slice(0, 60)}"\n\nReverts ${version.commitSha}.`),
        files: version.files.map((f) => ({ path: f.path, content: f.before })),
      });
      code = { commitSha, parentCommitSha: head, files };
    }
    await ctx.runMutation(internal.ai.versions.finishRollback, { userId, versionId, ...code });
    if (code) await ctx.runAction(internal.ai.repo.sync, { force: true }).catch(() => undefined);
  },
});
