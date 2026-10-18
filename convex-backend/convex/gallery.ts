import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { text } from "./lib/validate";
import { deleteImage, requireImage } from "./images";

const fields = (args: { subtext?: string }) => ({
  subtext: text(args.subtext ?? "", "Caption", { max: 255 }),
});

export const create = mutation({
  args: { imageId: v.id("images"), subtext: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("gallery", {
      ...fields(args),
      imageId: await requireImage(ctx, args.imageId),
      createdAt: Date.now(),
    });
  },
});

/** `imageId` is only passed when the picture was replaced. */
export const update = mutation({
  args: { id: v.id("gallery"), imageId: v.optional(v.id("images")), subtext: v.optional(v.string()) },
  handler: async (ctx, { id, imageId, ...args }) => {
    await requireAdmin(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) return;
    if (imageId && imageId !== doc.imageId) {
      await requireImage(ctx, imageId);
      await deleteImage(ctx, doc.imageId);
    }
    await ctx.db.patch(id, { ...fields(args), imageId: imageId ?? doc.imageId, createdAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("gallery") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) return;
    await ctx.db.delete(id);
    await deleteImage(ctx, doc.imageId);
  },
});
