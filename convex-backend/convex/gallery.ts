import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { altTextPatch, text } from "./lib/validate";
import { requireImage } from "./images";
import { recordCmsEdit } from "./lib/history";

const fields = (args: { subtext?: string; alt_text?: string }) => ({
  subtext: text(args.subtext ?? "", "Caption", { max: 255 }),
  ...altTextPatch(args.alt_text),
});

export const create = mutation({
  args: { imageId: v.id("images"), subtext: v.optional(v.string()), alt_text: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const id = await ctx.db.insert("gallery", {
      ...fields(args),
      imageId: await requireImage(ctx, args.imageId),
      createdAt: Date.now(),
    });
    await recordCmsEdit(ctx, "gallery", id, null, await ctx.db.get(id));
    return id;
  },
});

/** `imageId` is only passed when the picture was replaced. */
export const update = mutation({
  args: { id: v.id("gallery"), imageId: v.optional(v.id("images")), subtext: v.optional(v.string()), alt_text: v.optional(v.string()) },
  handler: async (ctx, { id, imageId, ...args }) => {
    await requireAdmin(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) return;
    // The old picture is kept: the version history can put it back.
    if (imageId && imageId !== doc.imageId) await requireImage(ctx, imageId);
    await ctx.db.patch(id, { ...fields(args), imageId: imageId ?? doc.imageId, createdAt: Date.now() });
    await recordCmsEdit(ctx, "gallery", id, doc, await ctx.db.get(id));
  },
});

export const remove = mutation({
  args: { id: v.id("gallery") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) return;
    await ctx.db.delete(id);
    // The picture is kept so the deletion can be undone from the history.
    await recordCmsEdit(ctx, "gallery", id, doc, null);
  },
});
