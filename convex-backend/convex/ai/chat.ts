// What the AI Assistant page calls: send a message, answer a confirm card, stop,
// discard, report the preview's build result.
import { ConvexError, v } from "convex/values";
import { createThread, listMessages, saveMessage } from "@convex-dev/agent";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { components } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { requireAdmin } from "../lib/access";
import { audit } from "./audit";
import { applyConfirmedDelete } from "./drafts";
import { MAX_BUILD_RETRIES, NOTE_PREFIX, resumeEditor, startEditor, startReview } from "./flow";
import { loadSettings } from "./settings";

const OPEN: Doc<"changeSets">["status"][] = ["drafting", "building", "reviewing", "needs_admin", "ready", "publishing"];
const MAX_PROMPT_CHARS = 8000;
const MAX_POINTED = 10;
const MAX_POINTED_CHARS = 20_000;
// Chat messages go to the provider and the activity log, so keys must not get in.
const LOOKS_LIKE_A_KEY = /\b(AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{10,}|github_pat_[A-Za-z0-9_]{10,})\b/;

async function openDraft(ctx: QueryCtx, threadId: string) {
  const rows = await ctx.db.query("changeSets").withIndex("by_threadId", (q) => q.eq("threadId", threadId)).order("desc").take(5);
  return rows.find((cs) => OPEN.includes(cs.status)) ?? null;
}

async function requireOwnThread(ctx: QueryCtx | MutationCtx, threadId: string, userId: Id<"users">) {
  const thread = await ctx.runQuery(components.agent.threads.getThread, { threadId });
  if (!thread || thread.userId !== userId) throw new ConvexError("This conversation doesn't exist.");
}

async function requireOwnDraft(ctx: QueryCtx, changeSetId: Id<"changeSets">, userId: Id<"users">) {
  const cs = await ctx.db.get(changeSetId);
  if (!cs || cs.createdBy !== userId) throw new ConvexError("This draft no longer exists.");
  return cs;
}

/** The admin's most recent conversation and its open draft, if any. */
export const latest = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAdmin(ctx);
    const page = await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      userId,
      order: "desc",
      paginationOpts: { numItems: 1, cursor: null },
    });
    return page.page[0]?._id ?? null;
  },
});

/** The draft shown on the page: the open one, or else the last to finish. */
export const draft = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const userId = await requireAdmin(ctx);
    await requireOwnThread(ctx, threadId, userId);
    const open = await openDraft(ctx, threadId);
    if (open) return open;
    return await ctx.db.query("changeSets").withIndex("by_threadId", (q) => q.eq("threadId", threadId)).order("desc").first();
  },
});

/** Chat messages in order, without tool results. */
export const messages = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const userId = await requireAdmin(ctx);
    await requireOwnThread(ctx, threadId, userId);
    const page = await listMessages(ctx, components.agent, { threadId, paginationOpts: { numItems: 200, cursor: null } });
    return [...page.page].reverse().flatMap((doc) => {
      const role = doc.message?.role;
      if (role !== "user" && role !== "assistant") return [];
      const content = doc.message?.content;
      const tools = Array.isArray(content) ? content.flatMap((part: any) => (part.type === "tool-call" ? [part.toolName as string] : [])) : [];
      const text = (doc.text ?? "").trim();
      if (!text && tools.length === 0) return [];
      const note = role === "user" && text.startsWith(NOTE_PREFIX);
      return [{
        id: doc._id,
        role: note ? ("note" as const) : role,
        text: note ? text.slice(NOTE_PREFIX.length) : text,
        tools,
        failed: doc.status === "failed",
      }];
    });
  },
});

export const newThread = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAdmin(ctx);
    return await createThread(ctx, components.agent, { userId, title: "AI Assistant" });
  },
});

export const send = mutation({
  args: { threadId: v.optional(v.string()), prompt: v.string(), selectedElements: v.optional(v.array(v.any())) },
  handler: async (ctx, { threadId: given, prompt, selectedElements = [] }) => {
    const userId = await requireAdmin(ctx);
    const clean = prompt.trim();
    if (!clean) throw new ConvexError("Please type a message.");
    if (clean.length > MAX_PROMPT_CHARS) throw new ConvexError(`Please keep messages under ${MAX_PROMPT_CHARS} characters.`);
    if (LOOKS_LIKE_A_KEY.test(clean)) {
      throw new ConvexError("That looks like an API key, so it wasn't sent. Add keys on the AI settings page, where they're stored encrypted.");
    }
    if (selectedElements.length > MAX_POINTED || JSON.stringify(selectedElements).length > MAX_POINTED_CHARS) {
      throw new ConvexError(`Please point at no more than ${MAX_POINTED} things at a time.`);
    }

    const threadId = given ?? (await createThread(ctx, components.agent, { userId, title: "AI Assistant" }));
    if (given) await requireOwnThread(ctx, given, userId);

    const settings = await loadSettings(ctx);
    let cs = await openDraft(ctx, threadId);
    if (cs) {
      if (cs.running) throw new ConvexError("The assistant is still working. Wait for it to finish, or press Stop.");
      if (cs.pendingConfirm) throw new ConvexError("Please answer the question about the delete first.");
      if (cs.status === "publishing") throw new ConvexError("This draft is being published. Wait for that to finish.");
      // A new instruction starts fresh retry counts: it isn't the same attempt.
      await ctx.db.patch(cs._id, {
        reviewAttempts: 0,
        buildAttempts: 0,
        review: undefined,
        buildError: undefined,
        editorModel: settings.editorModel,
        reviewerModel: settings.reviewerModel,
        // What the review checks against: everything the admin has asked for.
        title: `${cs.title}\n${clean}`.slice(-MAX_PROMPT_CHARS),
        // Only what this message points at.
        selectedElements,
      });
      cs = (await ctx.db.get(cs._id))!;
    } else {
      const now = Date.now();
      const id = await ctx.db.insert("changeSets", {
        threadId,
        title: clean,
        status: "drafting",
        contentOps: [],
        codeEdits: [],
        changeList: [],
        reviewAttempts: 0,
        buildAttempts: 0,
        editorModel: settings.editorModel,
        reviewerModel: settings.reviewerModel,
        selectedElements,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
      cs = (await ctx.db.get(id))!;
    }

    const count = selectedElements.length;
    const text = count ? `${clean}\n\n(The admin pointed at ${count === 1 ? "an element" : `${count} elements`} in the preview. Call get_selected_element.)` : clean;
    const { messageId } = await saveMessage(ctx, components.agent, { threadId, userId, prompt: text });
    await audit(ctx, { userId, changeSetId: cs._id, action: "prompt", detail: { prompt: clean, selectedElements } });
    await startEditor(ctx, cs, messageId);
    return { threadId, changeSetId: cs._id };
  },
});

/** The admin answers the confirm card for a delete. */
export const answerConfirm = mutation({
  args: { changeSetId: v.id("changeSets"), approve: v.boolean() },
  handler: async (ctx, { changeSetId, approve }) => {
    const userId = await requireAdmin(ctx);
    const cs = await requireOwnDraft(ctx, changeSetId, userId);
    const pending = cs.pendingConfirm;
    if (!pending) throw new ConvexError("There is nothing waiting to be confirmed.");
    await audit(ctx, { userId, changeSetId, action: approve ? "delete.confirmed" : "delete.declined", detail: pending });
    if (approve) await applyConfirmedDelete(ctx, cs);
    else await ctx.db.patch(changeSetId, { pendingConfirm: undefined });
    await resumeEditor(
      ctx,
      (await ctx.db.get(changeSetId))!,
      approve
        ? `The admin confirmed deleting "${pending.label}". It is now in the draft. Carry on with the request.`
        : `The admin said no to deleting "${pending.label}". Don't delete it; carry on with the rest, or ask what they'd prefer.`,
    );
  },
});

/** Stops the agent. The draft is kept; a step already under way can't write to it. */
export const stop = mutation({
  args: { changeSetId: v.id("changeSets") },
  handler: async (ctx, { changeSetId }) => {
    const userId = await requireAdmin(ctx);
    const cs = await requireOwnDraft(ctx, changeSetId, userId);
    if (cs.status === "publishing") throw new ConvexError("Publishing can't be stopped.");
    await audit(ctx, { userId, changeSetId, action: "agent.stoppedByAdmin" });
    await ctx.db.patch(changeSetId, {
      status: "needs_admin",
      running: false,
      runSeq: (cs.runSeq ?? 0) + 1,
      notice: "Stopped. Your draft is kept. Send a message to carry on, or discard it.",
      updatedAt: Date.now(),
    });
  },
});

export const discard = mutation({
  args: { changeSetId: v.id("changeSets") },
  handler: async (ctx, { changeSetId }) => {
    const userId = await requireAdmin(ctx);
    const cs = await requireOwnDraft(ctx, changeSetId, userId);
    if (!OPEN.includes(cs.status) || cs.status === "publishing") throw new ConvexError("This draft can't be discarded now.");
    await audit(ctx, { userId, changeSetId, action: "discard" });
    await ctx.db.patch(changeSetId, {
      status: "discarded",
      running: false,
      runSeq: (cs.runSeq ?? 0) + 1,
      pendingConfirm: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * The admin's browser compiled the preview. `revision` is the `updatedAt` it
 * compiled, so a result for an older version of the draft is ignored.
 */
export const reportBuild = mutation({
  args: { changeSetId: v.id("changeSets"), revision: v.number(), error: v.union(v.string(), v.null()) },
  handler: async (ctx, { changeSetId, revision, error }) => {
    const userId = await requireAdmin(ctx);
    const cs = await requireOwnDraft(ctx, changeSetId, userId);
    if (cs.status !== "building" || cs.updatedAt !== revision) return;
    await audit(ctx, { userId, changeSetId, action: error ? "build.failed" : "build.passed", detail: { error } });
    if (!error) {
      await startReview(ctx, cs);
      return;
    }
    const buildAttempts = cs.buildAttempts + 1;
    if (buildAttempts > MAX_BUILD_RETRIES) {
      await ctx.db.patch(changeSetId, {
        status: "needs_admin",
        running: false,
        buildAttempts,
        buildError: error.slice(0, 2000),
        notice: "The change still doesn't build, so it can't be published. Tell the assistant what to try, or discard the draft.",
        updatedAt: Date.now(),
      });
      return;
    }
    await ctx.db.patch(changeSetId, { buildAttempts });
    await resumeEditor(ctx, { ...cs, buildAttempts }, `The preview failed to build with this error. Fix it, then finish your turn:\n${error.slice(0, 2000)}`);
  },
});
