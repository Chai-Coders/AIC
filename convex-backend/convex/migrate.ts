import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { teamCategory } from "./schema";
import { deleteImage, insertImage } from "./images";

// Used only by scripts/migrate-from-django.mjs (with the admin key) to copy the
// old Django content in. Rows are matched on `legacyId`, so re-running the
// script updates them instead of creating duplicates.

const imageArgs = {
  variants: v.array(v.object({ width: v.number(), storageId: v.id("_storage") })),
  width: v.number(),
  height: v.number(),
};

export const generateUploadUrl = internalMutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

export const createImage = internalMutation({
  args: imageArgs,
  handler: async (ctx, args) => await insertImage(ctx, args),
});

const record = v.union(
  v.object({
    table: v.literal("gallery"),
    doc: v.object({ imageId: v.id("images"), subtext: v.string(), createdAt: v.number() }),
  }),
  v.object({
    table: v.literal("startups"),
    doc: v.object({
      name: v.string(),
      description: v.string(),
      logoId: v.id("images"),
      websiteUrl: v.optional(v.string()),
      createdAt: v.number(),
    }),
  }),
  v.object({
    table: v.literal("news"),
    doc: v.object({
      title: v.string(),
      subtitle: v.string(),
      content: v.string(),
      thumbnailId: v.id("images"),
      publishedDate: v.string(),
    }),
  }),
  v.object({
    table: v.literal("teamMembers"),
    doc: v.object({
      name: v.string(),
      role: v.string(),
      category: teamCategory,
      photoId: v.optional(v.id("images")),
      bio: v.string(),
      createdAt: v.number(),
    }),
  }),
);

const IMAGE_FIELD = { gallery: "imageId", startups: "logoId", news: "thumbnailId", teamMembers: "photoId" } as const;

/** Inserts or replaces the row with this legacyId; returns "created" or "updated". */
export const upsert = internalMutation({
  args: { legacyId: v.number(), record },
  handler: async (ctx, { legacyId, record: { table, doc } }) => {
    const existing = await ctx.db
      .query(table)
      .withIndex("by_legacyId", (q) => q.eq("legacyId", legacyId))
      .unique();
    if (!existing) {
      await ctx.db.insert(table, { ...doc, legacyId } as any);
      return "created";
    }
    const field = IMAGE_FIELD[table];
    const oldImage = (existing as any)[field];
    if (oldImage && oldImage !== (doc as any)[field]) await deleteImage(ctx, oldImage);
    await ctx.db.replace(existing._id, { ...doc, legacyId } as any);
    return "updated";
  },
});

export const setBackgroundVideo = internalMutation({
  args: {
    videoName: v.string(),
    videoUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),
    muxAssetId: v.optional(v.string()),
    muxPlaybackId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("backgroundVideo").first();
    if (existing) await ctx.db.replace(existing._id, args);
    else await ctx.db.insert("backgroundVideo", args);
  },
});
