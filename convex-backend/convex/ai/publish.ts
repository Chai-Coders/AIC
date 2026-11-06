// Publish: the only code path that changes the live site. Code is committed
// first; content records are written only after the deploy succeeds. Both are
// replayed exactly as they were reviewed.
import { ConvexError, v } from "convex/values";
import { action, internalAction, internalMutation, mutation, type MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ContentOp, ContentTable } from "../schema";
import { requireAdmin } from "../lib/access";
import { audit } from "./audit";
import { blobText, branchHead, commitFiles, commitTree, deployState, githubBranch, safeCommitMessage } from "./github";
import { editBlockedReason } from "./protected";
import { applyReorder, sameValue } from "./records";

const POLL_MS = 20_000;
// Vercel reports within moments. No report means nothing watches this branch.
const NO_SIGNAL_AFTER_MS = 5 * 60 * 1000;
const GIVE_UP_AFTER_MS = 30 * 60 * 1000;
const MAX_SNAPSHOT_CHARS = 900_000;

const errorText = (e: unknown) => (e instanceof ConvexError ? String(e.data) : e instanceof Error ? e.message : String(e));

const kindOf = (cs: Doc<"changeSets">) =>
  cs.codeEdits.length && cs.contentOps.length ? ("mixed" as const) : cs.codeEdits.length ? ("code" as const) : ("content" as const);

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

/** Applies typed ops in one transaction, returning what each record looked like. */
async function applyContentOps(ctx: MutationCtx, ops: ContentOp[]) {
  const conflicts = await contentConflicts(ctx, ops);
  if (conflicts.length) {
    throw new ConvexError(`The content changed since this draft was made: ${conflicts.join("; ")}. Nothing was applied.`);
  }
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
      const entry = { table: "siteText" as const, id: op.key, before: op.from === null ? null : { key: op.key, value: op.from } };
      snapshot.set(`text:${op.key}`, { ...entry, after: await writeSiteText(ctx, op.key, op.to) });
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
      for (const { id, createdAt } of applyReorder(docs, op.ids)) {
        await ctx.db.patch(id as Id<"gallery">, { createdAt } as any);
        await refresh(id);
      }
    }
  }
  return [...snapshot.values()];
}

export const begin = internalMutation({
  args: { userId: v.id("users"), changeSetId: v.id("changeSets"), override: v.boolean() },
  handler: async (ctx, { userId, changeSetId, override }) => {
    const cs = await ctx.db.get(changeSetId);
    if (!cs || cs.createdBy !== userId) throw new ConvexError("This draft no longer exists.");
    const decidedByAdmin = cs.status === "needs_admin" && cs.review?.verdict === "rejected" && !cs.pendingConfirm && !cs.buildError && override;
    if (cs.status !== "ready" && !decidedByAdmin) {
      throw new ConvexError("This draft hasn't passed review, so it can't be published yet.");
    }
    if (!cs.contentOps.length && !cs.codeEdits.length) throw new ConvexError("This draft has no changes to publish.");
    for (const edit of cs.codeEdits) {
      const blocked = editBlockedReason(edit.path);
      if (blocked) throw new ConvexError(`${edit.path} can't be published: ${blocked}.`);
    }
    const conflicts = await contentConflicts(ctx, cs.contentOps);
    if (conflicts.length) {
      throw new ConvexError(`The content changed since this draft was made: ${conflicts.join("; ")}. Discard the draft and ask again.`);
    }
    await audit(ctx, { userId, changeSetId, action: decidedByAdmin ? "publish.overrideReview" : "publish.start", detail: { reasons: cs.review?.reasons } });
    await ctx.db.patch(changeSetId, { status: "publishing", notice: undefined, updatedAt: Date.now() });
    return cs;
  },
});

/** Puts a draft back when Publish stopped before changing anything. */
export const abort = internalMutation({
  args: { changeSetId: v.id("changeSets"), status: v.union(v.literal("ready"), v.literal("needs_admin")), notice: v.string() },
  handler: async (ctx, { changeSetId, status, notice }) => {
    const cs = await ctx.db.get(changeSetId);
    await audit(ctx, { userId: cs?.createdBy, changeSetId, action: "publish.stopped", detail: { notice } });
    await ctx.db.patch(changeSetId, { status, notice, updatedAt: Date.now() });
  },
});

function afterPublishNotice(cs: Doc<"changeSets">) {
  const notes: string[] = [];
  if (cs.codeEdits.some((e) => e.path.startsWith("convex-backend/"))) {
    notes.push("Backend code was committed. It takes effect once a developer deploys it (npx convex dev or deploy from this branch).");
  }
  if (cs.codeEdits.some((e) => e.path.startsWith("cms_gui/"))) {
    notes.push("CMS code was committed. It takes effect once a developer restarts or rebuilds the CMS from this branch.");
  }
  return notes.join(" ") || undefined;
}

export const finishPublish = internalMutation({
  args: {
    changeSetId: v.id("changeSets"),
    commitSha: v.optional(v.string()),
    parentCommitSha: v.optional(v.string()),
    files: v.optional(v.array(v.object({ path: v.string(), before: v.union(v.string(), v.null()) }))),
    // Code is committed and the content has to wait for the deploy.
    waitForDeploy: v.boolean(),
  },
  handler: async (ctx, { changeSetId, commitSha, parentCommitSha, files, waitForDeploy }): Promise<Id<"versions">> => {
    const cs = (await ctx.db.get(changeSetId))!;
    const now = Date.now();
    const hasContent = cs.contentOps.length > 0;
    const contentSnapshot = hasContent && !waitForDeploy ? await applyContentOps(ctx, cs.contentOps) : [];
    const versionId = await ctx.db.insert("versions", {
      changeSetId,
      kind: kindOf(cs),
      summary: summaryOf(cs),
      contentSnapshot,
      commitSha,
      parentCommitSha,
      files,
      status: waitForDeploy ? "content_pending" : "ok",
      publishedBy: cs.createdBy,
      publishedAt: now,
    });
    await audit(ctx, { userId: cs.createdBy, changeSetId, action: "publish.committed", detail: { versionId, commitSha, waitForDeploy } });
    if (waitForDeploy) {
      await ctx.db.patch(changeSetId, { versionId, notice: "Code is committed. Waiting for the website to deploy before applying the content changes.", updatedAt: now });
      await ctx.scheduler.runAfter(POLL_MS, internal.ai.publish.watchDeploy, { versionId, startedAt: now });
    } else {
      await ctx.db.patch(changeSetId, { status: "published", versionId, running: false, notice: afterPublishNotice(cs), updatedAt: now });
    }
    return versionId;
  },
});

async function settleContent(ctx: MutationCtx, version: Doc<"versions">, cs: Doc<"changeSets">) {
  const contentSnapshot = await applyContentOps(ctx, cs.contentOps);
  await ctx.db.patch(version._id, { status: "ok", contentSnapshot, error: undefined });
  await ctx.db.patch(cs._id, { status: "published", notice: afterPublishNotice(cs), updatedAt: Date.now() });
  await audit(ctx, { userId: cs.createdBy, changeSetId: cs._id, action: "publish.contentApplied", detail: { versionId: version._id } });
}

/** The deploy succeeded: write the content. Conflicts leave the code in place. */
export const applyAfterDeploy = internalMutation({
  args: { versionId: v.id("versions") },
  handler: async (ctx, { versionId }) => {
    const version = await ctx.db.get(versionId);
    const cs = version?.changeSetId ? await ctx.db.get(version.changeSetId) : null;
    if (!version || !cs || version.status !== "content_pending") return;
    await settleContent(ctx, version, cs);
  },
});

export const failPublish = internalMutation({
  args: { versionId: v.id("versions"), error: v.string() },
  handler: async (ctx, { versionId, error }) => {
    const version = await ctx.db.get(versionId);
    const cs = version?.changeSetId ? await ctx.db.get(version.changeSetId) : null;
    if (!version || !cs || version.status !== "content_pending") return;
    await ctx.db.patch(versionId, { status: "failed", error });
    await ctx.db.patch(cs._id, { status: "failed", notice: error, updatedAt: Date.now() });
    await audit(ctx, { userId: cs.createdBy, changeSetId: cs._id, action: "publish.failed", detail: { error } });
  },
});

export const noteWaiting = internalMutation({
  args: { versionId: v.id("versions"), notice: v.string() },
  handler: async (ctx, { versionId, notice }) => {
    const version = await ctx.db.get(versionId);
    if (version?.changeSetId && version.status === "content_pending") {
      await ctx.db.patch(version.changeSetId, { notice, updatedAt: Date.now() });
    }
  },
});

export const watchDeploy = internalAction({
  args: { versionId: v.id("versions"), startedAt: v.number() },
  handler: async (ctx, { versionId, startedAt }): Promise<void> => {
    const version: Doc<"versions"> | null = await ctx.runQuery(internal.ai.versions.getInternal, { versionId });
    if (!version || version.status !== "content_pending" || !version.commitSha) return;
    const elapsed = Date.now() - startedAt;
    let state: Awaited<ReturnType<typeof deployState>> = "pending";
    try {
      state = await deployState(version.commitSha);
    } catch {
      // A GitHub hiccup; try again on the next poll.
    }
    if (state === "success") {
      try {
        await ctx.runMutation(internal.ai.publish.applyAfterDeploy, { versionId });
      } catch (e) {
        await ctx.runMutation(internal.ai.publish.failPublish, { versionId, error: `The code was published, but the content couldn't be applied. ${errorText(e)}` });
      }
      return;
    }
    if (state === "failure") {
      await ctx.runMutation(internal.ai.publish.failPublish, {
        versionId,
        error: "The website failed to deploy, so the content changes were not applied. The code is committed; roll it back from AI history.",
      });
      return;
    }
    if (state === "none" && elapsed > NO_SIGNAL_AFTER_MS) {
      await ctx.runMutation(internal.ai.publish.noteWaiting, {
        versionId,
        notice: "The code is committed, but nothing has reported a deploy for it. Once the website shows the new code, press Apply content.",
      });
    }
    if (elapsed < GIVE_UP_AFTER_MS) {
      await ctx.scheduler.runAfter(POLL_MS, internal.ai.publish.watchDeploy, { versionId, startedAt });
    }
  },
});

/** The admin's way out when no deploy signal arrives. */
export const applyPendingContent = mutation({
  args: { versionId: v.id("versions") },
  handler: async (ctx, { versionId }) => {
    const userId = await requireAdmin(ctx);
    const version = await ctx.db.get(versionId);
    const cs = version?.changeSetId ? await ctx.db.get(version.changeSetId) : null;
    if (!version || !cs || version.status !== "content_pending") throw new ConvexError("There is no content waiting to be applied.");
    await audit(ctx, { userId, changeSetId: cs._id, action: "publish.contentAppliedByAdmin", detail: { versionId } });
    await settleContent(ctx, version, cs);
  },
});

/** The admin gives up on the waiting content. The commit stays and can be rolled back. */
export const abandonPendingContent = mutation({
  args: { versionId: v.id("versions") },
  handler: async (ctx, { versionId }) => {
    const userId = await requireAdmin(ctx);
    const version = await ctx.db.get(versionId);
    const cs = version?.changeSetId ? await ctx.db.get(version.changeSetId) : null;
    if (!version || !cs || version.status !== "content_pending") throw new ConvexError("There is no content waiting to be applied.");
    const error = "The content changes were abandoned by the admin. The code is committed; roll it back from AI history if it isn't wanted.";
    await ctx.db.patch(versionId, { status: "failed", error });
    await ctx.db.patch(cs._id, { status: "failed", notice: error, updatedAt: Date.now() });
    await audit(ctx, { userId, changeSetId: cs._id, action: "publish.contentAbandoned", detail: { versionId } });
  },
});

export const publish = action({
  args: { changeSetId: v.id("changeSets"), override: v.optional(v.boolean()) },
  handler: async (ctx, { changeSetId, override }): Promise<void> => {
    const userId = await requireAdmin(ctx);
    const cs: Doc<"changeSets"> = await ctx.runMutation(internal.ai.publish.begin, { userId, changeSetId, override: !!override });
    const previous = cs.status === "ready" ? ("ready" as const) : ("needs_admin" as const);
    const stopWith = async (notice: string) => {
      await ctx.runMutation(internal.ai.publish.abort, { changeSetId, status: previous, notice });
      throw new ConvexError(notice);
    };

    if (!cs.codeEdits.length) {
      try {
        await ctx.runMutation(internal.ai.publish.finishPublish, { changeSetId, waitForDeploy: false });
      } catch (e) {
        await stopWith(errorText(e));
      }
      return;
    }

    let commit: { sha: string; parent: string; files: { path: string; before: string | null }[] };
    try {
      const head = await branchHead();
      const { entries } = await commitTree(head);
      const current = new Map(entries.map((e) => [e.path, e.sha]));
      const changed = cs.codeEdits.filter((e) => (current.get(e.path) ?? null) !== e.baseSha).map((e) => e.path);
      if (changed.length) {
        await stopWith(`These files changed on ${githubBranch()} since the draft started, so nothing was published: ${changed.join(", ")}. Discard the draft and ask again.`);
      }
      const files = await Promise.all(
        cs.codeEdits.map(async (e) => ({ path: e.path, before: e.baseSha ? await blobText(e.baseSha) : null })),
      );
      if (files.reduce((sum, f) => sum + (f.before?.length ?? 0), 0) > MAX_SNAPSHOT_CHARS) {
        await stopWith("These files are too large to keep a rollback copy of, so nothing was published. Ask a developer to make this change.");
      }
      const items = cs.changeList.map((c) => `- ${c.summary}`).join("\n");
      const message = safeCommitMessage(`AI Assistant: ${summaryOf(cs).slice(0, 60)}\n\n${items}`);
      const sha = await commitFiles({ parentSha: head, message, files: cs.codeEdits.map((e) => ({ path: e.path, content: e.content })) });
      commit = { sha, parent: head, files };
    } catch (e) {
      if (e instanceof ConvexError) throw e;
      return await stopWith(`Publishing stopped before anything changed: ${errorText(e)}`);
    }

    // Only the website has a deploy to wait for.
    const waitForDeploy = cs.contentOps.length > 0 && cs.codeEdits.some((e) => e.path.startsWith("frontend/"));
    const committed = { changeSetId, commitSha: commit.sha, parentCommitSha: commit.parent, files: commit.files };
    try {
      await ctx.runMutation(internal.ai.publish.finishPublish, { ...committed, waitForDeploy });
    } catch (e) {
      // The commit is on the branch, so it must be recorded, or it can't be rolled back.
      const versionId: Id<"versions"> = await ctx.runMutation(internal.ai.publish.finishPublish, { ...committed, waitForDeploy: true });
      await ctx.runMutation(internal.ai.publish.failPublish, {
        versionId,
        error: `The code was published, but the content couldn't be applied. ${errorText(e)}`,
      });
    }
    await ctx.runAction(internal.ai.repo.sync, { force: true }).catch(() => undefined);
  },
});
