// Audit log: every prompt, tool call, review verdict, publish and rollback.
import { v } from "convex/values";
import { internalMutation, query, type MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireAdmin } from "../lib/access";

// Long values (file contents) are cut so one row stays small.
const MAX_STRING = 4000;
function trim(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}… [${value.length} chars]` : value;
  if (depth > 6 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 200).map((x) => trim(x, depth + 1));
  return Object.fromEntries(Object.entries(value).filter(([, x]) => x !== undefined).map(([k, x]) => [k, trim(x, depth + 1)]));
}

export async function audit(
  ctx: MutationCtx,
  entry: { userId?: Id<"users">; action: string; changeSetId?: Id<"changeSets">; model?: string; detail?: unknown; costUsd?: number },
) {
  await ctx.db.insert("auditLog", { ...entry, detail: trim(entry.detail ?? null), at: Date.now() });
}

export const log = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    action: v.string(),
    changeSetId: v.optional(v.id("changeSets")),
    model: v.optional(v.string()),
    detail: v.optional(v.any()),
    costUsd: v.optional(v.number()),
  },
  handler: async (ctx, entry) => audit(ctx, entry),
});

// How far back the log page looks, so one query stays small.
const BROWSE_LOOKBACK = 1000;

export function categoryOf(action: string) {
  if (action === "prompt") return "requests";
  if (action.startsWith("tool.")) return "edits";
  if (action.startsWith("model.")) return "models";
  if (action.startsWith("review.") || action === "sent.overrideReview" || action === "publish.overrideReview") return "reviews";
  // "publish" and "rollback": older rows, from before drafts went to the Versions page.
  if (action.startsWith("sent") || action.startsWith("publish") || action.startsWith("rollback") || action === "discard") return "sending";
  if (action.startsWith("settings.") || action.startsWith("prices.")) return "settings";
  return "other";
}

/** The log page: one category and one model at a time, with what they add up to. */
export const browse = query({
  args: { category: v.optional(v.string()), model: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { category, model, limit }) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("auditLog").withIndex("by_at").order("desc").take(BROWSE_LOOKBACK);
    const withInfo = rows.map((row) => ({ ...row, category: categoryOf(row.action), model: row.model ?? (row.detail?.model as string | undefined) }));
    const models = [...new Set(withInfo.flatMap((row) => (row.model ? [row.model] : [])))].sort();
    const shown = withInfo.filter((row) => (!category || row.category === category) && (!model || row.model === model));
    return {
      rows: shown.slice(0, Math.min(limit ?? 100, 500)),
      models,
      total: shown.length,
      modelCalls: shown.filter((row) => row.category === "models").length,
      costUsd: shown.reduce((sum, row) => sum + (row.costUsd ?? 0), 0),
    };
  },
});

/** Most recent entries, optionally for one draft. */
export const list = query({
  args: { changeSetId: v.optional(v.id("changeSets")), limit: v.optional(v.number()) },
  handler: async (ctx, { changeSetId, limit }) => {
    await requireAdmin(ctx);
    const n = Math.min(limit ?? 100, 500);
    if (changeSetId) {
      return await ctx.db.query("auditLog").withIndex("by_changeSet", (q) => q.eq("changeSetId", changeSetId)).order("desc").take(n);
    }
    return await ctx.db.query("auditLog").withIndex("by_at").order("desc").take(n);
  },
});
