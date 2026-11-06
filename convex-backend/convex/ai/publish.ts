// Publish: the only code path that changes the live site. It replays the draft's
// typed changes into the Convex tables, exactly as they were reviewed, in one
// transaction, and the public site reads them from there.
import { ConvexError, v } from "convex/values";
import { mutation, type MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { ContentOp, ContentTable } from "../schema";
import { requireAdmin } from "../lib/access";
import { audit } from "./audit";
import { applyReorder, sameValue } from "./records";

export const summaryOf = (cs: Doc<"changeSets">) => cs.changeList.map((c) => c.summary).join("; ").slice(0, 500) || cs.title.slice(0, 200);

/** Records whose current values no longer match what the draft was built on. */
export async function contentConflicts(ctx: MutationCtx, ops: ContentOp[]) {
  const conflicts: string[] = [];
  for (const op of ops) {
    if (op.op === "text") {
      const row = await ctx.db.query("siteText").withIndex("by_key", (q) => q.eq("key", op.key)).unique();
      if ((row?.value ?? null) !== op.from) conflicts.push(`the website text ${op.key} has changed`);
      continue;
    }
    if (op.op !== "update") continue;
    const id = ctx.db.normalizeId(op.table, op.id);
    const doc = id ? ((await ctx.db.get(id)) as Record<string, unknown> | null) : null;
    if (!doc) conflicts.push(`a ${op.table} record has been deleted`);
    else if (!sameValue(doc[op.field], op.from)) conflicts.push(`"${op.field}" on a ${op.table} record has changed`);
  }
  return conflicts;
}

export type SnapshotEntry = { table: ContentTable | "siteText"; id: string; before: unknown; after: unknown };

/** Sets or (with null) removes one website text. Returns its value as { key, value }. */
export async function writeSiteText(ctx: MutationCtx, key: string, value: string | null) {
  const row = await ctx.db.query("siteText").withIndex("by_key", (q) => q.eq("key", key)).unique();
  if (value === null) {
    if (row) await ctx.db.delete(row._id);
    return null;
  }
  if (row) await ctx.db.patch(row._id, { value, updatedAt: Date.now() });
  else await ctx.db.insert("siteText", { key, value, updatedAt: Date.now() });
  return { key, value };
}

/** Applies typed ops, returning what each record looked like before and after. */
async function applyContentOps(ctx: MutationCtx, ops: ContentOp[]) {
  const snapshot = new Map<string, SnapshotEntry>();
  const touch = async (table: ContentTable, rawId: string) => {
    const id = ctx.db.normalizeId(table, rawId);
    const doc = id ? await ctx.db.get(id) : null;
    if (!id || !doc) return null;
    if (!snapshot.has(rawId)) snapshot.set(rawId, { table, id: rawId, before: doc, after: doc });
    return { id, doc: doc as Record<string, any> };
  };
  const refresh = async (rawId: string) => {
    const entry = snapshot.get(rawId)!;
    entry.after = await ctx.db.get(rawId as Id<ContentTable>);
  };

  for (const op of ops) {
    if (op.op === "text") {
      const before = op.from === null ? null : { key: op.key, value: op.from };
      snapshot.set(`text:${op.key}`, { table: "siteText", id: op.key, before, after: await writeSiteText(ctx, op.key, op.to) });
    } else if (op.op === "update") {
      const found = await touch(op.table, op.id);
      if (!found) continue;
      await ctx.db.patch(found.id, { [op.field]: op.to ?? undefined } as any);
      await refresh(op.id);
    } else if (op.op === "create") {
      const id = await ctx.db.insert(op.table, op.doc as any);
      snapshot.set(id, { table: op.table, id, before: null, after: await ctx.db.get(id) });
    } else if (op.op === "delete") {
      const found = await touch(op.table, op.id);
      if (!found) continue;
      // Its picture stays in the library so a rollback can restore the record.
      await ctx.db.delete(found.id);
      await refresh(op.id);
    } else if (op.op === "reorder") {
      const docs = [];
      for (const rawId of op.ids) {
        const found = await touch(op.table, rawId);
        if (found) docs.push({ ...found.doc });
      }
      for (const { id, createdAt } of applyReorder(docs, op.ids, op.table)) {
        await ctx.db.patch(id as Id<"gallery">, { createdAt } as any);
        await refresh(id);
      }
    }
  }
  return [...snapshot.values()];
}

export const publish = mutation({
  args: { changeSetId: v.id("changeSets"), override: v.optional(v.boolean()) },
  handler: async (ctx, { changeSetId, override }) => {
    const userId = await requireAdmin(ctx);
    const cs = await ctx.db.get(changeSetId);
    if (!cs || cs.createdBy !== userId) throw new ConvexError("This draft no longer exists.");
    const decidedByAdmin = cs.status === "needs_admin" && cs.review?.verdict === "rejected" && !cs.pendingConfirm && !!override;
    if (cs.status !== "ready" && !decidedByAdmin) {
      throw new ConvexError("This draft hasn't passed review, so it can't be published yet.");
    }
    if (!cs.contentOps.length) throw new ConvexError("This draft has no changes to publish.");
    const conflicts = await contentConflicts(ctx, cs.contentOps);
    if (conflicts.length) {
      throw new ConvexError(`The content changed since this draft was made: ${conflicts.join("; ")}. Nothing was published. Discard the draft and ask again.`);
    }
    const now = Date.now();
    const versionId = await ctx.db.insert("versions", {
      changeSetId,
      kind: "content",
      summary: summaryOf(cs),
      contentSnapshot: await applyContentOps(ctx, cs.contentOps),
      publishedBy: userId,
      publishedAt: now,
    });
    await ctx.db.patch(changeSetId, { status: "published", versionId, running: false, notice: undefined, updatedAt: now });
    await audit(ctx, { userId, changeSetId, action: decidedByAdmin ? "publish.overrideReview" : "publish", detail: { versionId, reasons: cs.review?.reasons } });
  },
});
