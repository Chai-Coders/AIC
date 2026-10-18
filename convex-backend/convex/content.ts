import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { imageUrl } from "./images";

// Public read API. Records are returned in the same JSON shape the Django REST
// API used (snake_case fields, image URLs, ISO dates), so the website and the
// CMS components did not need to change.

const CATEGORY_LABELS = {
  team: "AIC Team",
  mentor: "International Mentor",
  governor: "Board of Governors",
} as const;

const iso = (ms: number) => new Date(ms).toISOString();

export const toGallery = (doc: Doc<"gallery">) => ({
  id: doc._id,
  image: imageUrl(doc.imageId),
  subtext: doc.subtext,
  created_at: iso(doc.createdAt),
});

export const toStartup = (doc: Doc<"startups">) => ({
  id: doc._id,
  name: doc.name,
  description: doc.description,
  logo_or_image: imageUrl(doc.logoId),
  website_url: doc.websiteUrl ?? null,
  created_at: iso(doc.createdAt),
});

export const toNews = (doc: Doc<"news">) => ({
  id: doc._id,
  title: doc.title,
  subtitle: doc.subtitle,
  content: doc.content,
  thumbnail: imageUrl(doc.thumbnailId),
  published_date: doc.publishedDate,
});

export const toTeamMember = (doc: Doc<"teamMembers">) => ({
  id: doc._id,
  name: doc.name,
  role: doc.role,
  category: doc.category,
  category_display: CATEGORY_LABELS[doc.category],
  photo: imageUrl(doc.photoId),
  bio: doc.bio,
  created_at: iso(doc.createdAt),
});

export const toBackgroundVideo = (doc: Doc<"backgroundVideo">) => ({
  id: doc._id,
  video_name: doc.videoName,
  video_url: doc.videoUrl,
  thumbnail_url: doc.thumbnailUrl ?? null,
  mux_asset_id: doc.muxAssetId ?? null,
  mux_playback_id: doc.muxPlaybackId ?? null,
  created_at: iso(doc.createdAt),
  updated_at: iso(doc.updatedAt),
});

/**
 * Everything the public site shows, in one call: gallery, startups and news
 * (newest first), team members (by name) and the background video or null.
 */
export const siteContent = query({
  args: {},
  handler: async (ctx) => {
    const [gallery, startups, news, team, video] = await Promise.all([
      ctx.db.query("gallery").withIndex("by_createdAt").order("desc").collect(),
      ctx.db.query("startups").withIndex("by_createdAt").order("desc").collect(),
      ctx.db.query("news").withIndex("by_publishedDate").order("desc").collect(),
      ctx.db.query("teamMembers").withIndex("by_name").collect(),
      ctx.db.query("backgroundVideo").first(),
    ]);
    return {
      gallery: gallery.map(toGallery),
      startups: startups.map(toStartup),
      news: news.map(toNews),
      team: team.map(toTeamMember),
      background_video: video ? toBackgroundVideo(video) : null,
    };
  },
});

/** One news article by id, or null if it doesn't exist (or the id is malformed). */
export const newsItem = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const newsId = ctx.db.normalizeId("news", id);
    const doc = newsId && (await ctx.db.get(newsId));
    return doc ? toNews(doc) : null;
  },
});
