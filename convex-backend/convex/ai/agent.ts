// The agents. Each editor step is one scheduled action making one model call,
// saving its progress before the next is scheduled. That keeps long tasks inside
// Convex's action time limit, and checks the spend cap before every call.
import { Agent, stepCountIs } from "@convex-dev/agent";
import { generateText, hasToolCall } from "ai";
import { ConvexError, v } from "convex/values";
import { internalAction, internalMutation, internalQuery, type ActionCtx } from "../_generated/server";
import { components, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { audit } from "./audit";
import { lineDiff } from "./diff";
import { afterEditorStep, haltForAdmin, MAX_REVIEW_RETRIES, resumeEditor } from "./flow";
import { languageModel } from "./models";
import { EDITOR_INSTRUCTIONS, REVIEWER_INSTRUCTIONS } from "./prompts";
import { describeOp } from "./records";
import { providerKey } from "./settings";
import { editorTools, reviewerTools } from "./tools";

const MAX_OUTPUT_TOKENS = 16000;
const MAX_REVIEW_STEPS = 10;

const errorText = (e: unknown) => (e instanceof ConvexError ? String(e.data) : e instanceof Error ? e.message : String(e));

async function recordUsage(
  ctx: ActionCtx,
  args: { provider: string; model: string; role: "editor" | "reviewer"; changeSetId: Id<"changeSets">; userId: Id<"users"> },
  usage: { inputTokens?: number; outputTokens?: number },
) {
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  const { userId, ...rest } = args;
  const costUsd: number = await ctx.runMutation(internal.ai.usage.record, { ...rest, inputTokens, outputTokens });
  await ctx.runMutation(internal.ai.audit.log, {
    userId,
    changeSetId: args.changeSetId,
    action: `model.${args.role}`,
    detail: { model: args.model, inputTokens, outputTokens },
    costUsd,
  });
}

// ---- Editor ----------------------------------------------------------------

export const saveEditorStep = internalMutation({
  args: { changeSetId: v.id("changeSets"), runSeq: v.number(), finishReason: v.string() },
  handler: async (ctx, { changeSetId, runSeq, finishReason }) => {
    const cs = await ctx.db.get(changeSetId);
    if (!cs || cs.runSeq !== runSeq || !cs.running) return;
    await afterEditorStep(ctx, cs, { finishReason });
  },
});

export const haltRun = internalMutation({
  args: { changeSetId: v.id("changeSets"), runSeq: v.number(), notice: v.string(), detail: v.optional(v.string()) },
  handler: async (ctx, { changeSetId, runSeq, notice, detail }) => {
    const cs = await ctx.db.get(changeSetId);
    if (!cs || cs.runSeq !== runSeq || !cs.running) return;
    await audit(ctx, { userId: cs.createdBy, changeSetId, action: "agent.stopped", detail: { notice, detail } });
    await haltForAdmin(ctx, changeSetId, notice);
  },
});

export const editorStep = internalAction({
  args: { changeSetId: v.id("changeSets"), runSeq: v.number() },
  handler: async (ctx, { changeSetId, runSeq }): Promise<void> => {
    const cs: Doc<"changeSets"> | null = await ctx.runQuery(internal.ai.drafts.stepState, { changeSetId });
    if (!cs || cs.runSeq !== runSeq || !cs.running || cs.status !== "drafting" || !cs.promptMessageId) return;
    const ref = cs.editorModel;

    try {
      await ctx.runQuery(internal.ai.usage.check, ref);
    } catch (e) {
      await ctx.runMutation(internal.ai.agent.haltRun, { changeSetId, runSeq, notice: errorText(e) });
      return;
    }

    // The session's copy of the code. Content edits still work if this fails.
    if (!cs.stepCount) {
      try {
        await ctx.runAction(internal.ai.repo.sync, {});
      } catch (e) {
        await ctx.runMutation(internal.ai.audit.log, { changeSetId, action: "repo.syncFailed", detail: { error: errorText(e) } });
      }
    }

    try {
      const apiKey = await providerKey(ctx, ref.provider);
      const meta = { provider: ref.provider, model: ref.model, role: "editor" as const, changeSetId, userId: cs.createdBy };
      const agent = new Agent(components.agent, {
        name: "AI Assistant",
        languageModel: languageModel(ref.provider, ref.model, apiKey),
        instructions: EDITOR_INSTRUCTIONS,
        tools: editorTools({ ctx, changeSetId, runSeq, userId: cs.createdBy }),
        usageHandler: async (usageCtx, { usage }) => {
          await recordUsage(usageCtx as ActionCtx, meta, usage);
        },
      });
      const result = await agent.generateText(
        ctx,
        { threadId: cs.threadId },
        { promptMessageId: cs.promptMessageId, stopWhen: stepCountIs(1), maxOutputTokens: MAX_OUTPUT_TOKENS } as any,
      );
      await ctx.runMutation(internal.ai.agent.saveEditorStep, { changeSetId, runSeq, finishReason: String(result.finishReason) });
    } catch (e) {
      const text = errorText(e);
      await ctx.runMutation(internal.ai.agent.haltRun, {
        changeSetId,
        runSeq,
        notice: e instanceof ConvexError ? text : `The AI provider returned an error, so the assistant stopped. Your draft is kept. (${text.slice(0, 300)})`,
        detail: text,
      });
    }
  },
});

// ---- Review ----------------------------------------------------------------

export const reviewMaterial = internalQuery({
  args: { changeSetId: v.id("changeSets") },
  handler: async (ctx, { changeSetId }) => {
    const cs = await ctx.db.get(changeSetId);
    if (!cs) return null;
    const diffs = [];
    for (const edit of cs.codeEdits) {
      const row = await ctx.db.query("repoFiles").withIndex("by_path", (q) => q.eq("path", edit.path)).unique();
      diffs.push(`--- ${edit.path}${edit.content === null ? " (deleted)" : row ? "" : " (new file)"}\n${lineDiff(row?.content ?? null, edit.content)}`);
    }
    return { diffs, ops: cs.contentOps.map(describeOp) };
  },
});

export const saveVerdict = internalMutation({
  args: { changeSetId: v.id("changeSets"), runSeq: v.number(), approved: v.boolean(), reasons: v.array(v.string()) },
  handler: async (ctx, { changeSetId, runSeq, approved, reasons }) => {
    const cs = await ctx.db.get(changeSetId);
    if (!cs || cs.runSeq !== runSeq || cs.status !== "reviewing") return;
    const now = Date.now();
    const review = { verdict: approved ? ("approved" as const) : ("rejected" as const), reasons, at: now };
    await audit(ctx, { userId: cs.createdBy, changeSetId, action: approved ? "review.approved" : "review.rejected", detail: { reasons } });
    if (approved) {
      await ctx.db.patch(changeSetId, { status: "ready", running: false, review, updatedAt: now });
      return;
    }
    const reviewAttempts = cs.reviewAttempts + 1;
    if (reviewAttempts > MAX_REVIEW_RETRIES) {
      await ctx.db.patch(changeSetId, { status: "needs_admin", running: false, review, reviewAttempts, updatedAt: now });
      return;
    }
    await ctx.db.patch(changeSetId, { reviewAttempts });
    await resumeEditor(ctx, { ...cs, reviewAttempts }, `The review agent rejected the draft. Fix these problems, then finish your turn:\n- ${reasons.join("\n- ")}`);
  },
});

/** The review gave no verdict: the admin decides, with that as the objection. */
export const noVerdict = internalMutation({
  args: { changeSetId: v.id("changeSets"), runSeq: v.number(), reason: v.string() },
  handler: async (ctx, { changeSetId, runSeq, reason }) => {
    const cs = await ctx.db.get(changeSetId);
    if (!cs || cs.runSeq !== runSeq || cs.status !== "reviewing") return;
    await audit(ctx, { userId: cs.createdBy, changeSetId, action: "review.noVerdict", detail: { reason } });
    await ctx.db.patch(changeSetId, {
      status: "needs_admin",
      running: false,
      review: { verdict: "rejected", reasons: [reason], at: Date.now() },
      updatedAt: Date.now(),
    });
  },
});

export const reviewStep = internalAction({
  args: { changeSetId: v.id("changeSets"), runSeq: v.number() },
  handler: async (ctx, { changeSetId, runSeq }): Promise<void> => {
    const cs: Doc<"changeSets"> | null = await ctx.runQuery(internal.ai.drafts.stepState, { changeSetId });
    if (!cs || cs.runSeq !== runSeq || cs.status !== "reviewing") return;
    const ref = cs.reviewerModel;
    try {
      await ctx.runQuery(internal.ai.usage.check, ref);
      const apiKey = await providerKey(ctx, ref.provider);
      const material = (await ctx.runQuery(internal.ai.agent.reviewMaterial, { changeSetId }))!;
      const meta = { provider: ref.provider, model: ref.model, role: "reviewer" as const, changeSetId, userId: cs.createdBy };
      let verdict: { approved: boolean; reasons: string[] } | null = null;
      let overBudget = false;

      const prompt = [
        `What the admin asked for:\n${cs.title}`,
        `Change list shown to the admin:\n${cs.changeList.map((c) => `- ${c.summary}${c.page ? ` (${c.page})` : ""}`).join("\n") || "(empty)"}`,
        `Content edits:\n${material.ops.join("\n") || "(none)"}`,
        `Code edits (line diffs):\n${material.diffs.join("\n\n") || "(none)"}`,
      ].join("\n\n");

      // Providers can't all be forced to call a tool, so a review ending without
      // a verdict is handled below rather than assumed to be a pass.
      await generateText({
        model: languageModel(ref.provider, ref.model, apiKey),
        system: REVIEWER_INSTRUCTIONS,
        prompt,
        tools: reviewerTools({ ctx, changeSetId, userId: cs.createdBy }, (result) => {
          verdict = result;
        }) as any,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        stopWhen: [
          stepCountIs(MAX_REVIEW_STEPS),
          hasToolCall("approve"),
          hasToolCall("reject"),
          // The cap applies between review steps too.
          async () => {
            try {
              await ctx.runQuery(internal.ai.usage.check, ref);
              return false;
            } catch {
              overBudget = true;
              return true;
            }
          },
        ],
        onStepEnd: async (step: { usage: { inputTokens?: number; outputTokens?: number } }) => {
          await recordUsage(ctx, meta, step.usage);
        },
      } as any);

      const final = verdict as { approved: boolean; reasons: string[] } | null;
      if (final) {
        await ctx.runMutation(internal.ai.agent.saveVerdict, { changeSetId, runSeq, ...final });
      } else if (overBudget) {
        await ctx.runMutation(internal.ai.agent.haltRun, {
          changeSetId,
          runSeq,
          notice: "This month's AI budget ran out during the review. Raise the budget on the AI settings page and send a message to continue; your draft is kept.",
        });
      } else {
        await ctx.runMutation(internal.ai.agent.noVerdict, { changeSetId, runSeq, reason: "The review agent finished without giving a verdict, so this draft hasn't been passed." });
      }
    } catch (e) {
      const text = errorText(e);
      await ctx.runMutation(internal.ai.agent.haltRun, {
        changeSetId,
        runSeq,
        notice: e instanceof ConvexError ? text : `The review couldn't finish because the AI provider returned an error. Your draft is kept. (${text.slice(0, 300)})`,
        detail: text,
      });
    }
  },
});

