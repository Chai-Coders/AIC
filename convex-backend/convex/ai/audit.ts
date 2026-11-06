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
  entry: { userId?: Id<"users">; action: string; changeSetId?: Id<"changeSets">; detail?: unknown; costUsd?: number },
) {
  await ctx.db.insert("auditLog", { ...entry, detail: trim(entry.detail ?? null), at: Date.now() });
}

export const log = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    action: v.string(),
    changeSetId: v.optional(v.id("changeSets")),
    detail: v.optional(v.any()),
    costUsd: v.optional(v.number()),
  },
  handler: async (ctx, entry) => audit(ctx, entry),
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
