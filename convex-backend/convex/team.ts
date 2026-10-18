import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { teamCategory, type TeamCategory } from "./schema";
import { requireAdmin } from "./lib/access";
import { text } from "./lib/validate";
import { deleteImage, requireImage } from "./images";

const fieldArgs = {
  name: v.string(),
  role: v.string(),
  category: teamCategory,
  bio: v.optional(v.string()),
};

const fields = (args: { name: string; role: string; category: TeamCategory; bio?: string }) => ({
  name: text(args.name, "Full name", { required: true, max: 150 }),
  role: text(args.role, "Job title", { required: true, max: 150 }),
  category: args.category,
  bio: text(args.bio ?? "", "Short bio"),
});

export const create = mutation({
  args: { ...fieldArgs, photoId: v.id("images") },
  handler: async (ctx, { photoId, ...args }) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("teamMembers", {
      ...fields(args),
      photoId: await requireImage(ctx, photoId),
      createdAt: Date.now(),
    });
  },
});

/** `photoId` is only passed when the photo was replaced. */
export const update = mutation({
  args: { ...fieldArgs, id: v.id("teamMembers"), photoId: v.optional(v.id("images")) },
  handler: async (ctx, { id, photoId, ...args }) => {
    await requireAdmin(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) return;
    if (photoId && photoId !== doc.photoId) {
      await requireImage(ctx, photoId);
      await deleteImage(ctx, doc.photoId);
    }
    await ctx.db.patch(id, { ...fields(args), photoId: photoId ?? doc.photoId, createdAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("teamMembers") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const doc = await ctx.db.get(id);
    if (!doc) return;
    await ctx.db.delete(id);
    await deleteImage(ctx, doc.photoId);
  },
});
