import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { optionalUrl, text } from "./lib/validate";
import { requireImage } from "./images";
import { recordCmsEdit } from "./lib/history";

const fieldArgs = {
  name: v.string(),
  description: v.string(),
  website_url: v.optional(v.string()),
};

const fields = (args: { name: string; description: string; website_url?: string }) => ({
  name: text(args.name, "Startup name", { required: true, max: 200 }),
  description: text(args.description, "Description", { required: true }),
  websiteUrl: optionalUrl(args.website_url, "Website"),
});

export const create = mutation({
  args: { ...fieldArgs, logoId: v.id("images") },
  handler: async (ctx, { logoId, ...args }) => {
    await requireAdmin(ctx);
    const id = await ctx.db.insert("startups", {
      ...fields(args),
      logoId: await requireImage(ctx, logoId),
      createdAt: Date.now(),
    });
    await recordCmsEdit(ctx, "startups", id, null, await ctx.db.get(id));
    return id;
  },
});

/** `logoId` is only passed when the logo was replaced. */
export const update = mutation({
  args: { ...fieldArgs, id: v.id("startups"), logoId: v.optional(v.id("images")) },
  handler: async (ctx, { id, logoId, ...args }) => {
    await requireAdmin(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) return;
    // The old picture is kept: the version history can put it back.
    if (logoId && logoId !== doc.logoId) await requireImage(ctx, logoId);
    // replace (not patch) so a cleared website is removed.
    const { _id, _creationTime, ...rest } = doc;
    await ctx.db.replace(id, { ...rest, ...fields(args), logoId: logoId ?? doc.logoId, createdAt: Date.now() });
    await recordCmsEdit(ctx, "startups", id, doc, await ctx.db.get(id));
  },
});

export const remove = mutation({
  args: { id: v.id("startups") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) return;
    await ctx.db.delete(id);
    // The picture is kept so the deletion can be undone from the history.
    await recordCmsEdit(ctx, "startups", id, doc, null);
  },
});
