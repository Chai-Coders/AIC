import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export const teamCategory = v.union(
  v.literal("team"),
  v.literal("mentor"),
  v.literal("governor"),
);

export default defineSchema({
  // users, authAccounts, authSessions, ... Every user is a CMS admin: there is
  // no public sign-up, accounts are created with `admin:createAdmin`.
  ...authTables,

  // One uploaded picture, stored as several WebP copies of increasing width so
  // pages can load the smallest one that looks sharp (see http.ts, /img/).
  images: defineTable({
    variants: v.array(v.object({ width: v.number(), storageId: v.id("_storage") })),
    // Size of the largest copy, for width/height attributes.
    width: v.number(),
    height: v.number(),
  }),

  // `legacyId` is the record's id in the old Django database. It is set only by
  // the one-time import (scripts/migrate-from-django.mjs) so it can be re-run.

  // Like Django, `createdAt` is also bumped on every edit, so the most recently
  // touched items are listed first.
  gallery: defineTable({
    imageId: v.id("images"),
    subtext: v.string(),
    createdAt: v.number(),
    legacyId: v.optional(v.number()),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_legacyId", ["legacyId"]),

  startups: defineTable({
    name: v.string(),
    description: v.string(),
    logoId: v.id("images"),
    websiteUrl: v.optional(v.string()),
    createdAt: v.number(),
    legacyId: v.optional(v.number()),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_legacyId", ["legacyId"]),

  news: defineTable({
    title: v.string(),
    subtitle: v.string(),
    content: v.string(),
    thumbnailId: v.id("images"),
    // ISO date, YYYY-MM-DD.
    publishedDate: v.string(),
    legacyId: v.optional(v.number()),
  })
    .index("by_publishedDate", ["publishedDate"])
    .index("by_legacyId", ["legacyId"]),

  teamMembers: defineTable({
    name: v.string(),
    role: v.string(),
    category: teamCategory,
    // Board members imported from the old site have no photo yet.
    photoId: v.optional(v.id("images")),
    bio: v.string(),
    createdAt: v.number(),
    legacyId: v.optional(v.number()),
  })
    .index("by_name", ["name"])
    .index("by_legacyId", ["legacyId"]),

  // At most one row: the video playing behind the homepage hero (hosted on Mux).
  backgroundVideo: defineTable({
    videoName: v.string(),
    videoUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),
    muxAssetId: v.optional(v.string()),
    muxPlaybackId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // Videos uploaded from the CMS that Mux is still processing. Once Mux has a
  // playback id the upload replaces the background video (see mux.ts).
  muxUploads: defineTable({
    uploadId: v.string(),
    videoName: v.string(),
    status: v.union(v.literal("waiting"), v.literal("ready"), v.literal("errored")),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_uploadId", ["uploadId"]),
});
