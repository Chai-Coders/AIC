import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { applyTarget, cmsSitting } from "./lib/history";
import { TEXTS } from "./lib/siteText";

// Text keys look like "home.programs.0.factLabel": words and numbers joined by
// dots.
const KEY = /^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*$/;
const MAX_KEY = 100;
const MAX_VALUE = 5000;
const MAX_CHANGES = 1000;

/**
 * Publishes edited website text in one go. `value: null` drops the edit, so
 * the website goes back to the text written in its code. Every change is
 * recorded in the version history like any other CMS edit, so it can be
 * undone from the Versions page.
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
    for (const { key, value } of changes) {
      if (key.length > MAX_KEY || !KEY.test(key)) {
        throw new ConvexError(`"${key}" is not a valid text name.`);
      }
      if (!TEXTS.has(key)) {
        throw new ConvexError(`The website has no text "${key}". Reload the page and try again.`);
      }
      if (value !== null && value.length > MAX_VALUE) {
        throw new ConvexError(`"${key}" can be at most ${MAX_VALUE} characters.`);
      }
    }
    const versionId = await cmsSitting(ctx);
    for (const { key, value } of changes) {
      await applyTarget(ctx, versionId, "siteText", key, "value", value ?? TEXTS.get(key)!.value);
    }
  },
});

/** Texts edited from the CMS, by key (texts showing their code wording are not included). Live. */
export const published = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("siteText").collect();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },
});
