// What the AI Assistant page calls: send a message, answer a confirm card, stop,
// discard.
import { ConvexError, v } from "convex/values";
import { createThread, listMessages, saveMessage } from "@convex-dev/agent";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { components } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { requireAdmin } from "../lib/access";
import { audit } from "./audit";
import { applyConfirmedDelete } from "./drafts";
import { NOTE_PREFIX, resumeEditor, startEditor } from "./flow";
import { loadSettings } from "./settings";

// A draft that passed review is "sent" to the Versions page; the next message starts a new one.
const OPEN: Doc<"changeSets">["status"][] = ["drafting", "reviewing", "needs_admin"];
const MAX_PROMPT_CHARS = 8000;
const MAX_POINTED = 10;
const MAX_POINTED_CHARS = 20_000;
const MAX_PICTURES = 3;
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

/**
 * The draft shown on the page: the open one, or else the last to finish. A sent
 * draft says what became of it on the Versions page: still `pending`, or
 * `approved` or `rejected` there.
 */
export const draft = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const userId = await requireAdmin(ctx);
    await requireOwnThread(ctx, threadId, userId);
    const open = await openDraft(ctx, threadId);
    if (open) return open;
    const last = await ctx.db.query("changeSets").withIndex("by_threadId", (q) => q.eq("threadId", threadId)).order("desc").first();
    if (last?.status !== "sent" || !last.versionId) return last;
    const version = await ctx.db.get(last.versionId);
    return { ...last, versionStatus: version?.status ?? "rejected" };
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
  args: { threadId: v.optional(v.string()), prompt: v.string(), selectedElements: v.optional(v.array(v.any())), pictures: v.optional(v.array(v.object({ imageId: v.id("images"), name: v.string() }))) },
  handler: async (ctx, { threadId: given, prompt, selectedElements = [], pictures = [] }) => {
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

    if (pictures.length > MAX_PICTURES) throw new ConvexError(`Please attach no more than ${MAX_PICTURES} pictures at a time.`);
    for (const { imageId } of pictures) {
      if (!(await ctx.db.get(imageId))) throw new ConvexError("One of the attached pictures could not be found. Please attach it again.");
    }

    const threadId = given ?? (await createThread(ctx, components.agent, { userId, title: "AI Assistant" }));
    if (given) await requireOwnThread(ctx, given, userId);

    const settings = await loadSettings(ctx);
    let cs = await openDraft(ctx, threadId);
    // What became of this chat's last changes on the Versions page, so the agent
    // doesn't assume rejected changes are still there (or approved ones aren't).
    let outcome: string | null = null;
    if (!cs && given) {
      const last = await ctx.db.query("changeSets").withIndex("by_threadId", (q) => q.eq("threadId", threadId)).order("desc").first();
      const version = last?.status === "sent" && last.versionId ? await ctx.db.get(last.versionId) : null;
      if (version?.status === "approved") outcome = "The admin approved the changes you sent earlier on the Versions page, so they are live now.";
      if (version?.status === "rejected") {
        outcome = "The admin rejected the changes you sent earlier on the Versions page, so they are not on the website and no longer waiting. Don't treat them as done.";
      }
    }
    if (cs) {
      if (cs.running) throw new ConvexError("The assistant is still working. Wait for it to finish, or press Stop.");
      if (cs.pendingConfirm) throw new ConvexError("Please answer the question about the delete first.");
      // A new instruction starts fresh retry counts: it isn't the same attempt.
      await ctx.db.patch(cs._id, {
        reviewAttempts: 0,
        review: undefined,
        editorModel: settings.editorModel,
        reviewerModel: settings.reviewerModel,
        // What the review checks against: everything the admin has asked for.
        title: `${cs.title}\n${clean}`.slice(-MAX_PROMPT_CHARS),
        // Only what this message points at.
        selectedElements,
        pictures: [...(cs.pictures ?? []), ...pictures],
      });
      cs = (await ctx.db.get(cs._id))!;
    } else {
      const now = Date.now();
      const id = await ctx.db.insert("changeSets", {
        threadId,
        title: clean,
        status: "drafting",
        contentOps: [],
        changeList: [],
        reviewAttempts: 0,
        editorModel: settings.editorModel,
        reviewerModel: settings.reviewerModel,
        selectedElements,
        pictures,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
      cs = (await ctx.db.get(id))!;
    }

    const count = selectedElements.length;
    const notes = [
      ...(outcome ? [outcome] : []),
      ...(count ? [`The admin pointed at ${count === 1 ? "an element" : `${count} elements`} in the preview. Call get_selected_element.`] : []),
      ...pictures.map((p) => `The admin attached a picture, "${p.name.replace(/["\n]/g, " ").slice(0, 80)}", with imageId ${p.imageId}.`),
    ];
    const text = notes.length ? `${clean}\n\n(${notes.join(" ")})` : clean;
    const { messageId } = await saveMessage(ctx, components.agent, { threadId, userId, prompt: text });
    await audit(ctx, { userId, changeSetId: cs._id, action: "prompt", detail: { prompt: clean, selectedElements, pictures } });
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
    // Nothing to stop, and a finished draft must never reopen: it could be sent twice.
    if (!cs.running) return;
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
    if (!OPEN.includes(cs.status)) throw new ConvexError("This draft can't be discarded now.");
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
