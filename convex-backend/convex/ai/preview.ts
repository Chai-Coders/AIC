// What the preview pane and the Changes tab read.
import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAdmin } from "../lib/access";
import { toBackgroundVideo, toGallery, toNews, toStartup, toTeamMember } from "../content";
import { loadTables } from "./drafts";
import { applyOps, applyTextOps, describeOp } from "./records";

/** Site content in the shape of content:siteContent, with a draft applied. */
export const siteContentPreview = query({
  args: { changeSetId: v.optional(v.id("changeSets")) },
  handler: async (ctx, { changeSetId }) => {
    await requireAdmin(ctx);
    const cs = changeSetId ? await ctx.db.get(changeSetId) : null;
    const t = applyOps(await loadTables(ctx), cs?.contentOps ?? []);
    // Same order as content:siteContent, including ties (newer record first).
    const tie = (a: any, b: any) => (b._creationTime ?? Infinity) - (a._creationTime ?? Infinity);
    const newest = (a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0) || tie(a, b);
    return {
      gallery: [...t.gallery].sort(newest).map((d) => toGallery(d as any)),
      startups: [...t.startups].sort(newest).map((d) => toStartup(d as any)),
      news: [...t.news].sort((a, b) => String(b.publishedDate).localeCompare(String(a.publishedDate)) || tie(a, b)).map((d) => toNews(d as any)),
      team: [...t.teamMembers].sort((a, b) => String(a.name) < String(b.name) ? -1 : String(a.name) > String(b.name) ? 1 : -tie(a, b)).map((d) => toTeamMember(d as any)),
      background_video: t.backgroundVideo[0] ? toBackgroundVideo(t.backgroundVideo[0] as any) : null,
      text: Object.entries(applyTextOps(await ctx.db.query("siteText").collect(), cs?.contentOps ?? [])).map(([key, value]) => ({ key, value })),
    };
  },
});

/** Everything in a draft, for the Changes tab. */
export const changes = query({
  args: { changeSetId: v.id("changeSets") },
  handler: async (ctx, { changeSetId }) => {
    await requireAdmin(ctx);
    const cs = await ctx.db.get(changeSetId);
    if (!cs) return null;
    return { content: cs.contentOps.map(describeOp) };
  },
});
