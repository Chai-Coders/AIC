// Moves a draft between states: running the editor, the build check, the review
// and back. Helpers for mutations; the agents themselves are in agent.ts.
import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { components, internal } from "../_generated/api";
import { saveMessage } from "@convex-dev/agent";
import { audit } from "./audit";

// Retry limits from the design: separate for build errors and review rejections.
export const MAX_BUILD_RETRIES = 2;
export const MAX_REVIEW_RETRIES = 2;
const MAX_EDITOR_STEPS = 40;
export const NOTE_PREFIX = "[Automated note] ";

/** Runs the editor on a message that's already saved in the thread. */
export async function startEditor(ctx: MutationCtx, cs: Doc<"changeSets">, promptMessageId: string) {
  const runSeq = (cs.runSeq ?? 0) + 1;
  await ctx.db.patch(cs._id, {
    status: "drafting",
    running: true,
    runSeq,
    promptMessageId,
    stepCount: 0,
    rateLimitWaits: 0,
    notice: undefined,
    updatedAt: Date.now(),
  });
  await ctx.scheduler.runAfter(0, internal.ai.agent.editorStep, { changeSetId: cs._id, runSeq });
}

/** Sends the editor back to work with a note it (and the admin) can read. */
export async function resumeEditor(ctx: MutationCtx, cs: Doc<"changeSets">, note: string) {
  const { messageId } = await saveMessage(ctx, components.agent, {
    threadId: cs.threadId,
    userId: cs.createdBy,
    prompt: NOTE_PREFIX + note,
  });
  await startEditor(ctx, cs, messageId);
}

/** The editor finished its turn: run the checks if it changed anything. */
export async function finishEditing(ctx: MutationCtx, cs: Doc<"changeSets">) {
  const now = Date.now();
  if (cs.contentOps.length === 0 && cs.codeEdits.length === 0) {
    // Just a reply or a question; the draft stays open.
    await ctx.db.patch(cs._id, { running: false, updatedAt: now });
    return;
  }
  if (cs.codeEdits.some((e) => e.path.startsWith("frontend/"))) {
    // The admin's browser compiles the preview and reports back (reportBuild).
    await ctx.db.patch(cs._id, { status: "building", running: false, updatedAt: now });
    return;
  }
  await startReview(ctx, cs);
}

export async function startReview(ctx: MutationCtx, cs: Doc<"changeSets">) {
  const runSeq = (cs.runSeq ?? 0) + 1;
  await ctx.db.patch(cs._id, { status: "reviewing", running: true, runSeq, rateLimitWaits: 0, notice: undefined, buildError: undefined, updatedAt: Date.now() });
  await ctx.scheduler.runAfter(0, internal.ai.agent.reviewStep, { changeSetId: cs._id, runSeq });
}

/** Stops the agent and hands over to the admin. The draft is kept. */
export async function haltForAdmin(ctx: MutationCtx, changeSetId: Id<"changeSets">, notice: string) {
  await ctx.db.patch(changeSetId, { status: "needs_admin", running: false, notice, updatedAt: Date.now() });
}

export async function afterEditorStep(
  ctx: MutationCtx,
  cs: Doc<"changeSets">,
  { finishReason }: { finishReason: string },
) {
  const stepCount = (cs.stepCount ?? 0) + 1;
  // A delete tool may have paused the draft during this step.
  if (cs.status !== "drafting") {
    await ctx.db.patch(cs._id, { stepCount, running: false });
    return;
  }
  if (finishReason === "tool-calls") {
    if (stepCount >= MAX_EDITOR_STEPS) {
      await audit(ctx, { changeSetId: cs._id, action: "editor.stepLimit", detail: { stepCount } });
      await haltForAdmin(ctx, cs._id, "The assistant took too many steps and stopped. Your draft is kept. Tell it how to continue, or discard the draft.");
      return;
    }
    await ctx.db.patch(cs._id, { stepCount, rateLimitWaits: 0, notice: undefined, updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.ai.agent.editorStep, { changeSetId: cs._id, runSeq: cs.runSeq ?? 0 });
    return;
  }
  await ctx.db.patch(cs._id, { stepCount, rateLimitWaits: 0, notice: undefined });
  if (finishReason === "stop") {
    await finishEditing(ctx, { ...cs, stepCount });
    return;
  }
  const why =
    finishReason === "length"
      ? "The assistant's reply was too long and got cut off."
      : finishReason === "content-filter"
        ? "The AI provider declined to continue this request."
        : "The assistant stopped unexpectedly.";
  await haltForAdmin(ctx, cs._id, `${why} Your draft is kept. Try a smaller request, or discard the draft.`);
}
