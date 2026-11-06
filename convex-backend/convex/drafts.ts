import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Number of changes waiting for approval in the AI draft (for the menu badge). */
export const pendingCount = query({
  args: {},
  handler: async (ctx) => {
    if (!(await getAuthUserId(ctx))) return 0;
    const draft = await ctx.db
      .query("versions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .first();
    return draft?.changeCount ?? 0;
  },
});
