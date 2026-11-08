import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { altTextPatch, text, todayIso } from "./lib/validate";
import { requireImage } from "./images";
import { recordCmsEdit } from "./lib/history";

const fieldArgs = {
  alt_text: v.optional(v.string()),
  title: v.string(),
  subtitle: v.optional(v.string()),
  content: v.string(),
};

const fields = (args: { title: string; subtitle?: string; content: string; alt_text?: string }) => ({
  ...altTextPatch(args.alt_text),
  title: text(args.title, "Headline", { required: true, max: 255 }),
  subtitle: text(args.subtitle ?? "", "Summary", { max: 300 }),
  content: text(args.content, "Article", { required: true }),
});

// As in Django, saving an article (new or edited) dates it today.

export const create = mutation({
  args: { ...fieldArgs, thumbnailId: v.id("images") },
  handler: async (ctx, { thumbnailId, ...args }) => {
    await requireAdmin(ctx);
    const id = await ctx.db.insert("news", {
      ...fields(args),
      thumbnailId: await requireImage(ctx, thumbnailId),
      publishedDate: todayIso(),
    });
    await recordCmsEdit(ctx, "news", id, null, await ctx.db.get(id));
    return id;
  },
});

/** `thumbnailId` is only passed when the cover image was replaced. */
export const update = mutation({
  args: { ...fieldArgs, id: v.id("news"), thumbnailId: v.optional(v.id("images")) },
  handler: async (ctx, { id, thumbnailId, ...args }) => {
    await requireAdmin(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) return;
    // The old picture is kept: the version history can put it back.
    if (thumbnailId && thumbnailId !== doc.thumbnailId) await requireImage(ctx, thumbnailId);
    await ctx.db.patch(id, {
      ...fields(args),
      // An edit keeps the article's date, as approving an AI edit does.
      thumbnailId: thumbnailId ?? doc.thumbnailId,
    });
    await recordCmsEdit(ctx, "news", id, doc, await ctx.db.get(id));
  },
});

export const remove = mutation({
  args: { id: v.id("news") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) return;
    await ctx.db.delete(id);
    // The picture is kept so the deletion can be undone from the history.
    await recordCmsEdit(ctx, "news", id, doc, null);
  },
});
