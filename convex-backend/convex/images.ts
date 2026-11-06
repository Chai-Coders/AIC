import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/access";

// Pictures are uploaded as a few resized WebP copies (made in the browser by
// the CMS, or by scripts/migrate-from-django.mjs), registered here as one
// `images` row, and served from /img/<id>?w=<width> (see http.ts).

const imageArgs = {
  variants: v.array(v.object({ width: v.number(), storageId: v.id("_storage") })),
  width: v.number(),
  height: v.number(),
};

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Registers uploaded copies of one picture; returns the id to save on a record. */
export const create = mutation({
  args: imageArgs,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await insertImage(ctx, args);
  },
});

export async function insertImage(
  ctx: MutationCtx,
  { variants, width, height }: { variants: { width: number; storageId: Id<"_storage"> }[]; width: number; height: number },
) {
  if (variants.length === 0) {
    throw new ConvexError("The picture could not be uploaded. Please try again.");
  }
  for (const variant of variants) {
    const file = await ctx.db.system.get(variant.storageId);
    if (!file) {
      throw new ConvexError("The picture could not be uploaded. Please try again.");
    }
    if (!file.contentType?.startsWith("image/")) {
      throw new ConvexError("That file is not a picture.");
    }
  }
  return await ctx.db.insert("images", {
    variants: [...variants].sort((a, b) => a.width - b.width),
    width,
    height,
  });
}

/** Removes a picture and its stored files. Safe to call with undefined. */
export async function deleteImage(ctx: MutationCtx, imageId: Id<"images"> | undefined) {
  if (!imageId) return;
  const image = await ctx.db.get(imageId);
  if (!image) return;
  for (const variant of image.variants) {
    await ctx.storage.delete(variant.storageId);
  }
  await ctx.db.delete(imageId);
}

/** Checks a picture id from a client before it is saved on a record. */
export async function requireImage(ctx: MutationCtx, imageId: Id<"images">) {
  if (!(await ctx.db.get(imageId))) {
    throw new ConvexError("The picture could not be found. Please upload it again.");
  }
  return imageId;
}

/** Public address of a picture; add ?w=<width> to get a smaller copy. */
export function imageUrl(imageId: Id<"images"> | undefined) {
  return imageId ? `${process.env.CONVEX_SITE_URL}/img/${imageId}` : null;
}

/**
 * The smallest stored copy at least `width` pixels wide (or the largest one),
 * for the /img/ route. Returns null for unknown ids.
 */
export const pickVariant = internalQuery({
  args: { imageId: v.string(), width: v.optional(v.number()) },
  handler: async (ctx, { imageId, width }) => {
    const id = ctx.db.normalizeId("images", imageId);
    const image = id && (await ctx.db.get(id));
    if (!image) return null;
    const wanted = width ?? Infinity;
    const variant = image.variants.find((x) => x.width >= wanted) ?? image.variants[image.variants.length - 1];
    return variant.storageId;
  },
});

const CLEANUP_AFTER_MS = 24 * 60 * 60 * 1000;

/**
 * Deletes pictures nobody uses: uploads abandoned when an edit was cancelled
 * or failed. Anything younger than a day is kept, since it may be mid-save.
 * Runs daily (crons.ts).
 */
export const cleanupUnused = internalMutation({
  // dryRun deletes nothing and returns the pictures it would have deleted.
  args: { keepNewerThanMs: v.optional(v.number()), dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { keepNewerThanMs, dryRun }) => {
    const cutoff = Date.now() - (keepNewerThanMs ?? CLEANUP_AFTER_MS);

    const used = new Set<string>();
    for (const row of await ctx.db.query("gallery").collect()) used.add(row.imageId);
    for (const row of await ctx.db.query("startups").collect()) used.add(row.logoId);
    for (const row of await ctx.db.query("news").collect()) used.add(row.thumbnailId);
    for (const row of await ctx.db.query("teamMembers").collect()) if (row.photoId) used.add(row.photoId);
    for (const row of await ctx.db.query("pageSections").collect()) if (row.imageId) used.add(row.imageId);
    // The AI Assistant's open drafts, and what its rollbacks can restore.
    const IMAGE_FIELDS = ["imageId", "logoId", "thumbnailId", "photoId"];
    const addFrom = (doc: unknown) => {
      for (const field of IMAGE_FIELDS) {
        const id = (doc as Record<string, unknown> | null)?.[field];
        if (typeof id === "string") used.add(id);
      }
    };
    for (const draft of await ctx.db.query("changeSets").collect()) {
      if (["published", "discarded", "failed"].includes(draft.status)) continue;
      for (const picture of draft.pictures ?? []) used.add(picture.imageId);
      for (const op of draft.contentOps) {
        if (op.op === "create") addFrom(op.doc);
        if (op.op === "update" && IMAGE_FIELDS.includes(op.field)) addFrom({ [op.field]: op.to });
      }
    }
    for (const version of await ctx.db.query("versions").collect()) {
      if (version.revertedBy) continue;
      for (const { before, table } of version.contentSnapshot) if (table !== "siteText") addFrom(before);
    }

    if (dryRun) {
      return (await ctx.db.query("images").collect()).filter((image) => !used.has(image._id) && image._creationTime < cutoff).map((image) => image._id as string);
    }

    let images = 0;
    // Files that belong to a picture: kept, or already deleted along with it.
    const handled = new Set<string>();
    for (const image of await ctx.db.query("images").collect()) {
      image.variants.forEach((x) => handled.add(x.storageId));
      if (!used.has(image._id) && image._creationTime < cutoff) {
        await deleteImage(ctx, image._id);
        images++;
      }
    }

    // Files uploaded but never registered as a picture.
    let files = 0;
    for (const file of await ctx.db.system.query("_storage").collect()) {
      if (!handled.has(file._id) && file._creationTime < cutoff) {
        await ctx.storage.delete(file._id);
        files++;
      }
    }
    if (images || files) console.log(`Removed ${images} unused pictures and ${files} stray files.`);
    return [];
  },
});
