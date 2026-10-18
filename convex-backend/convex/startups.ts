import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { optionalUrl, text } from "./lib/validate";
import { deleteImage, requireImage } from "./images";

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
    return await ctx.db.insert("startups", {
      ...fields(args),
      logoId: await requireImage(ctx, logoId),
      createdAt: Date.now(),
    });
  },
});

/** `logoId` is only passed when the logo was replaced. */
export const update = mutation({
  args: { ...fieldArgs, id: v.id("startups"), logoId: v.optional(v.id("images")) },
  handler: async (ctx, { id, logoId, ...args }) => {
    await requireAdmin(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) return;
    if (logoId && logoId !== doc.logoId) {
      await requireImage(ctx, logoId);
      await deleteImage(ctx, doc.logoId);
    }
    // replace (not patch) so a cleared website is removed.
    const { _id, _creationTime, ...rest } = doc;
    await ctx.db.replace(id, { ...rest, ...fields(args), logoId: logoId ?? doc.logoId, createdAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("startups") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) return;
    await ctx.db.delete(id);
    await deleteImage(ctx, doc.logoId);
  },
});
