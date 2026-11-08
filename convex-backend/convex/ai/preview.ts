// What the AI Assistant's website preview reads.
import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAdmin } from "../lib/access";
import { toBackgroundVideo, toGallery, toNews, toStartup, toTeamMember } from "../content";
import { loadTables, loadTexts } from "./drafts";
import { applyOps, applyTextOps } from "./records";

/**
 * Site content in the shape of content:siteContent. Without arguments it's the
 * live site. With `changeSetId` it's what the site will be once approved: the
 * pending AI draft (the Versions page) and the chat's draft applied. A draft
 * already sent is part of the pending AI draft, so it isn't applied twice.
 */
export const siteContentPreview = query({
  args: { changeSetId: v.optional(v.id("changeSets")), pending: v.optional(v.boolean()) },
  handler: async (ctx, { changeSetId, pending }) => {
    await requireAdmin(ctx);
    const cs = changeSetId ? await ctx.db.get(changeSetId) : null;
    const ops = cs && cs.status !== "sent" ? cs.contentOps : [];
    const withPending = pending || !!cs;
    const base = withPending
      ? await loadTables(ctx)
      : {
          gallery: await ctx.db.query("gallery").collect(),
          startups: await ctx.db.query("startups").collect(),
          news: await ctx.db.query("news").collect(),
          teamMembers: await ctx.db.query("teamMembers").collect(),
        };
    const texts = withPending ? await loadTexts(ctx) : Object.fromEntries((await ctx.db.query("siteText").collect()).map((r) => [r.key, r.value]));
    const t = applyOps(base, ops);
    const video = await ctx.db.query("backgroundVideo").first();
    // Same order as content:siteContent, including ties (newer record first).
    const tie = (a: any, b: any) => (b._creationTime ?? Infinity) - (a._creationTime ?? Infinity);
    const newest = (a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0) || tie(a, b);
    return {
      gallery: [...t.gallery].sort(newest).map((d) => toGallery(d as any)),
      startups: [...t.startups].sort(newest).map((d) => toStartup(d as any)),
      news: [...t.news].sort((a, b) => String(b.publishedDate).localeCompare(String(a.publishedDate)) || tie(a, b)).map((d) => toNews(d as any)),
      team: [...t.teamMembers].sort((a, b) => String(a.name) < String(b.name) ? -1 : String(a.name) > String(b.name) ? 1 : -tie(a, b)).map((d) => toTeamMember(d as any)),
      background_video: video ? toBackgroundVideo(video) : null,
      text: Object.entries(applyTextOps(texts, ops)).map(([key, value]) => ({ key, value })),
    };
  },
});
