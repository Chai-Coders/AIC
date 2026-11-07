// Token usage and spend. Providers don't report money remaining, so cost is
// worked out here as tokens × the admin's price table and compared with the
// monthly budget: warning at 80%, hard stop at 100% (the draft is kept).
import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, query, type QueryCtx } from "../_generated/server";
import { requireAdmin } from "../lib/access";
import { loadSettings, priceFor } from "./settings";
import type { ModelRef } from "../schema";

export const WARN_AT = 0.8;

export const currentMonth = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 7);

export async function monthSpend(ctx: QueryCtx, month = currentMonth()) {
  const rows = await ctx.db.query("usage").withIndex("by_month", (q) => q.eq("month", month)).collect();
  return rows.reduce((sum, r) => sum + r.costUsd, 0);
}

export async function spendState(ctx: QueryCtx) {
  const settings = await loadSettings(ctx);
  const spent = await monthSpend(ctx);
  const budget = settings.monthlyBudgetUsd;
  const ratio = budget > 0 ? spent / budget : 1;
  return {
    month: currentMonth(),
    spentUsd: spent,
    budgetUsd: budget,
    ratio,
    level: ratio >= 1 ? ("blocked" as const) : ratio >= WARN_AT ? ("warning" as const) : ("ok" as const),
    // Google's free plan bills nothing, but the plan can't be read from a key.
    onGoogle: settings.editorModel.provider === "google",
  };
}

/** The spend meter in the chat pane. */
export const meter = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await spendState(ctx);
  },
});

/** Throws a message for the admin if the model can't be used right now. */
export async function assertCanSpend(ctx: QueryCtx, ref: ModelRef) {
  const settings = await loadSettings(ctx);
  if (!priceFor(settings, ref)) {
    throw new ConvexError(
      `There is no price for ${ref.model} on the AI settings page, so its cost can't be tracked. Add its price per million tokens first.`,
    );
  }
  const state = await spendState(ctx);
  if (state.level === "blocked") {
    throw new ConvexError(
      `This month's AI budget is used up ($${state.spentUsd.toFixed(2)} of $${state.budgetUsd.toFixed(2)}). Raise the budget on the AI settings page to continue; your draft is kept.`,
    );
  }
}

export const check = internalQuery({
  args: { provider: v.string(), model: v.string() },
  handler: async (ctx, ref) => {
    await assertCanSpend(ctx, ref as ModelRef);
  },
});

/** Records one model call. Returns its cost. */
export const record = internalMutation({
  args: {
    provider: v.string(),
    model: v.string(),
    role: v.union(v.literal("editor"), v.literal("reviewer")),
    inputTokens: v.number(),
    outputTokens: v.number(),
    changeSetId: v.optional(v.id("changeSets")),
  },
  handler: async (ctx, args) => {
    const settings = await loadSettings(ctx);
    const price = priceFor(settings, args as ModelRef);
    // assertCanSpend refuses unpriced models, so a missing price here means it
    // was removed mid-task; count it at the most expensive known rate.
    const fallback = settings.priceTable.reduce(
      (max, p) => ({ inputPerMTok: Math.max(max.inputPerMTok, p.inputPerMTok), outputPerMTok: Math.max(max.outputPerMTok, p.outputPerMTok) }),
      { inputPerMTok: 0, outputPerMTok: 0 },
    );
    const rate = price ?? fallback;
    const costUsd = (args.inputTokens * rate.inputPerMTok + args.outputTokens * rate.outputPerMTok) / 1_000_000;
    const now = Date.now();
    await ctx.db.insert("usage", { ...args, costUsd, month: currentMonth(now), at: now });
    return costUsd;
  },
});

/** Spend per month and model, for the settings page. */
export const summary = query({
  args: { month: v.optional(v.string()) },
  handler: async (ctx, { month }) => {
    await requireAdmin(ctx);
    const m = month ?? currentMonth();
    const rows = await ctx.db.query("usage").withIndex("by_month", (q) => q.eq("month", m)).collect();
    const byModel = new Map<string, { provider: string; model: string; role: string; inputTokens: number; outputTokens: number; costUsd: number; calls: number }>();
    for (const r of rows) {
      const key = `${r.provider}/${r.model}/${r.role}`;
      const cur = byModel.get(key) ?? { provider: r.provider, model: r.model, role: r.role, inputTokens: 0, outputTokens: 0, costUsd: 0, calls: 0 };
      cur.inputTokens += r.inputTokens;
      cur.outputTokens += r.outputTokens;
      cur.costUsd += r.costUsd;
      cur.calls += 1;
      byModel.set(key, cur);
    }
    const settings = await loadSettings(ctx);
    const nameOf = (provider: string, model: string) => settings.priceTable.find((p) => p.provider === provider && p.model === model)?.name ?? model;
    return {
      month: m,
      // Grouped by provider, then model, with each model's two jobs together.
      rows: [...byModel.values()]
        .map((row) => ({ ...row, name: nameOf(row.provider, row.model) }))
        .sort((a, b) => a.provider.localeCompare(b.provider) || a.model.localeCompare(b.model) || a.role.localeCompare(b.role)),
      totalUsd: rows.reduce((sum, r) => sum + r.costUsd, 0),
    };
  },
});
