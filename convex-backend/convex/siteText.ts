import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdmin } from "./lib/access";

// Text keys look like "home.programs.0.factLabel": words and numbers joined by
// dots.
const KEY = /^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*$/;
const MAX_KEY = 100;
const MAX_VALUE = 5000;
const MAX_CHANGES = 1000;

/** The same limits for anything that writes website text. Throws a message. */
export function checkSiteText(key: string, value: string | null) {
  if (key.length > MAX_KEY || !KEY.test(key)) {
    throw new ConvexError(`"${key}" is not a valid text name.`);
  }
  if (value !== null && value.length > MAX_VALUE) {
    throw new ConvexError(`"${key}" can be at most ${MAX_VALUE} characters.`);
  }
}

/**
 * Publishes edited website text in one go. `value: null` drops the edit, so
 * the website goes back to the text written in its code.
 */
export const publish = mutation({
  args: {
    changes: v.array(v.object({ key: v.string(), value: v.union(v.string(), v.null()) })),
  },
  handler: async (ctx, { changes }) => {
    await requireAdmin(ctx);
    if (changes.length > MAX_CHANGES) {
      throw new ConvexError(`At most ${MAX_CHANGES} texts can be published at once.`);
    }
    const now = Date.now();
    for (const { key, value } of changes) {
      checkSiteText(key, value);
      const existing = await ctx.db
        .query("siteText")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      if (value === null) {
        if (existing) await ctx.db.delete(existing._id);
      } else if (existing) {
        await ctx.db.patch(existing._id, { value, updatedAt: now });
      } else {
        await ctx.db.insert("siteText", { key, value, updatedAt: now });
      }
    }
  },
});
