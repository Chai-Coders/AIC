import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { text, todayIso } from "./lib/validate";
import { deleteImage, requireImage } from "./images";

const fieldArgs = {
  title: v.string(),
  subtitle: v.optional(v.string()),
  content: v.string(),
};

const fields = (args: { title: string; subtitle?: string; content: string }) => ({
  title: text(args.title, "Headline", { required: true, max: 255 }),
  subtitle: text(args.subtitle ?? "", "Summary", { max: 300 }),
  content: text(args.content, "Article", { required: true }),
});

// As in Django, saving an article (new or edited) dates it today.

export const create = mutation({
  args: { ...fieldArgs, thumbnailId: v.id("images") },
  handler: async (ctx, { thumbnailId, ...args }) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("news", {
      ...fields(args),
      thumbnailId: await requireImage(ctx, thumbnailId),
      publishedDate: todayIso(),
    });
  },
});

/** `thumbnailId` is only passed when the cover image was replaced. */
export const update = mutation({
  args: { ...fieldArgs, id: v.id("news"), thumbnailId: v.optional(v.id("images")) },
  handler: async (ctx, { id, thumbnailId, ...args }) => {
    await requireAdmin(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) return;
    if (thumbnailId && thumbnailId !== doc.thumbnailId) {
      await requireImage(ctx, thumbnailId);
      await deleteImage(ctx, doc.thumbnailId);
    }
    await ctx.db.patch(id, {
      ...fields(args),
      thumbnailId: thumbnailId ?? doc.thumbnailId,
      publishedDate: todayIso(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("news") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) return;
    await ctx.db.delete(id);
    await deleteImage(ctx, doc.thumbnailId);
  },
});
