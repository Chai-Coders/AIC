import { ConvexError, v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/access";

// The homepage background video is hosted on Mux. Uploading from the CMS:
//   1. createUpload: Mux gives us a one-time upload URL.
//   2. The CMS uploads the file straight to that URL (it never passes
//      through this server, unlike the old Django endpoint).
//   3. finishUpload: waits for Mux to turn the upload into a playable asset,
//      makes it the background video and deletes the previous asset.
// Needs MUX_TOKEN_ID and MUX_TOKEN_SECRET (`npx convex env set ...`).

const MUX_API = "https://api.mux.com/video/v1";

function muxAuthHeader() {
  const id = process.env.MUX_TOKEN_ID;
  const secret = process.env.MUX_TOKEN_SECRET;
  if (!id || !secret) {
    throw new ConvexError("Video uploads are not set up yet (Mux credentials are missing).");
  }
  return `Basic ${btoa(`${id}:${secret}`)}`;
}

async function mux(path: string, init: RequestInit = {}) {
  const res = await fetch(`${MUX_API}${path}`, {
    ...init,
    headers: { Authorization: muxAuthHeader(), "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) {
    throw new Error(`Mux ${init.method ?? "GET"} ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.status === 204 ? null : ((await res.json()).data as Record<string, any>);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const createUpload = action({
  args: { videoName: v.string(), corsOrigin: v.string() },
  handler: async (ctx, { videoName, corsOrigin }) => {
    await requireAdmin(ctx);
    const upload = await mux("/uploads", {
      method: "POST",
      body: JSON.stringify({
        cors_origin: corsOrigin,
        new_asset_settings: { playback_policy: ["public"], video_quality: "basic" },
      }),
    });
    await ctx.runMutation(internal.mux.recordUpload, {
      uploadId: upload!.id,
      videoName: videoName.trim() || "Main Background Video",
    });
    return { uploadId: upload!.id as string, uploadUrl: upload!.url as string };
  },
});

/** Call after the file has been uploaded. Returns the new background video id. */
export const finishUpload = action({
  args: { uploadId: v.string() },
  handler: async (ctx, { uploadId }): Promise<string> => {
    await requireAdmin(ctx);
    const pending = await ctx.runQuery(internal.mux.getUpload, { uploadId });
    if (!pending) throw new ConvexError("Unknown upload.");

    try {
      // Mux creates the asset shortly after the upload completes.
      let assetId: string | undefined;
      for (let i = 0; i < 60 && !assetId; i++) {
        const upload = await mux(`/uploads/${uploadId}`);
        if (["errored", "cancelled", "timed_out"].includes(upload!.status)) {
          throw new ConvexError(`Mux rejected the video (${upload!.status}): ${upload!.error?.message ?? "unknown error"}`);
        }
        assetId = upload!.asset_id;
        if (!assetId) await sleep(2000);
      }
      if (!assetId) throw new ConvexError("Mux is taking too long to process the video. Please try again.");

      let playbackId: string | undefined;
      for (let i = 0; i < 30 && !playbackId; i++) {
        const asset = await mux(`/assets/${assetId}`);
        if (asset!.status === "errored") throw new ConvexError("Mux could not process this video.");
        playbackId = asset!.playback_ids?.[0]?.id;
        if (!playbackId) await sleep(2000);
      }
      if (!playbackId) throw new ConvexError("Mux did not create a playback id for the video.");

      const { videoId, previousAssetId } = await ctx.runMutation(internal.mux.useAsVideo, {
        uploadId,
        assetId,
        playbackId,
      });
      // Only remove the old asset once the new one is saved, so a failure never
      // leaves the site without a playable video.
      if (previousAssetId && previousAssetId !== assetId) {
        try {
          await mux(`/assets/${previousAssetId}`, { method: "DELETE" });
        } catch (err) {
          console.warn(`Could not delete previous Mux asset ${previousAssetId}:`, err);
        }
      }
      return videoId;
    } catch (err) {
      await ctx.runMutation(internal.mux.markErrored, { uploadId, error: String(err) });
      throw err;
    }
  },
});

export const recordUpload = internalMutation({
  args: { uploadId: v.string(), videoName: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("muxUploads", { ...args, status: "waiting", createdAt: Date.now() });
  },
});

export const getUpload = internalQuery({
  args: { uploadId: v.string() },
  handler: async (ctx, { uploadId }) =>
    await ctx.db.query("muxUploads").withIndex("by_uploadId", (q) => q.eq("uploadId", uploadId)).unique(),
});

export const markErrored = internalMutation({
  args: { uploadId: v.string(), error: v.string() },
  handler: async (ctx, { uploadId, error }) => {
    const upload = await ctx.db.query("muxUploads").withIndex("by_uploadId", (q) => q.eq("uploadId", uploadId)).unique();
    if (upload) await ctx.db.patch(upload._id, { status: "errored", error });
  },
});

export const useAsVideo = internalMutation({
  args: { uploadId: v.string(), assetId: v.string(), playbackId: v.string() },
  handler: async (ctx, { uploadId, assetId, playbackId }) => {
    const upload = await ctx.db.query("muxUploads").withIndex("by_uploadId", (q) => q.eq("uploadId", uploadId)).unique();
    if (upload) await ctx.db.patch(upload._id, { status: "ready" });

    const fields = {
      videoName: upload?.videoName ?? "Main Background Video",
      videoUrl: `https://stream.mux.com/${playbackId}.m3u8`,
      thumbnailUrl: `https://image.mux.com/${playbackId}/thumbnail.jpg`,
      muxAssetId: assetId,
      muxPlaybackId: playbackId,
      updatedAt: Date.now(),
    };
    const existing = await ctx.db.query("backgroundVideo").first();
    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return { videoId: existing._id, previousAssetId: existing.muxAssetId ?? null };
    }
    const videoId = await ctx.db.insert("backgroundVideo", { ...fields, createdAt: Date.now() });
    return { videoId, previousAssetId: null };
  },
});
