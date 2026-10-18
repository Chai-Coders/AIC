import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/** The signed-in CMS admin, or null. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const user = userId && (await ctx.db.get(userId));
    if (!user) return null;
    return { id: user._id, email: user.email ?? null, username: user.name || user.email || "admin" };
  },
});
