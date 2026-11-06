import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query, type QueryCtx } from "./_generated/server";
import { ENTITIES } from "./lib/registry";
import { getRecord } from "./lib/history";
import { randomToken, sha256 } from "./lib/tokens";
import { attachPendingImage, fieldKey, parseFieldKey } from "./drafts";

// One-time upload links (MCP request_upload_link). The AI can't receive a file
// from the chat, so it hands the admin a link to the CMS upload page, where a
// picture is dropped straight into the draft. The link is the only key: it is
// long, random, single-use and expires after an hour.

const LINK_LIFETIME_MS = 60 * 60 * 1000;

export const createLink = internalMutation({
  args: { app: v.string(), target: v.string() },
  handler: async (ctx, { app, target }) => {
    const { def, recordId, field } = parseFieldKey(target);
    if (field.kind !== "image") throw new ConvexError(`"${target}" is not a picture field.`);
    if (!recordId.startsWith("new-") && !(await getRecord(ctx, def.entity, recordId))) {
      throw new ConvexError(`No ${def.noun} has the id "${recordId}".`);
    }
    const token = randomToken();
    await ctx.db.insert("uploadTokens", {
      tokenHash: await sha256(token),
      app,
      entity: def.entity,
      recordId,
      field: field.key,
      expiresAt: Date.now() + LINK_LIFETIME_MS,
    });
    return { token, expiresInMinutes: LINK_LIFETIME_MS / 60000 };
  },
});

async function findLink(ctx: QueryCtx, token: string) {
  const tokenHash = await sha256(token);
  const link = await ctx.db
    .query("uploadTokens")
    .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
    .first();
  if (!link) return { link: null, problem: "This upload link isn’t valid. Ask the AI for a new one." };
  if (link.usedAt) return { link, problem: "This link has already been used. Ask the AI for a new one to send another picture." };
  if (link.expiresAt < Date.now()) return { link, problem: "This upload link has expired. Ask the AI for a new one." };
  return { link, problem: null };
}

/** What the upload page shows: where the picture goes, or why it can't. */
export const info = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { link, problem } = await findLink(ctx, token);
    if (!link || problem) return { ok: false as const, problem };
    const def = ENTITIES[link.entity];
    const field = def.fields.find((f) => f.key === link.field)!;
    const doc = link.recordId.startsWith("new-") ? null : await getRecord(ctx, link.entity, link.recordId);
    return {
      ok: true as const,
      app: link.app,
      page: def.page,
      fieldLabel: field.label,
      itemTitle: doc ? def.title(doc as never) : `the new ${def.noun}`,
      expiresAt: link.expiresAt,
    };
  },
});

export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { problem } = await findLink(ctx, token);
    if (problem) throw new ConvexError(problem);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Adds the uploaded picture to the draft and uses up the link. */
export const complete = mutation({
  args: { token: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, { token, storageId }) => {
    const { link, problem } = await findLink(ctx, token);
    if (!link || problem) throw new ConvexError(problem ?? "This upload link isn’t valid.");
    const file = await ctx.db.system.get(storageId);
    if (file && file.size > 15 * 1024 * 1024) {
      await ctx.storage.delete(storageId);
      throw new ConvexError("That picture is too large. Please choose one under 10 MB.");
    }
    await attachPendingImage(ctx, {
      app: link.app,
      target: fieldKey(link.entity, link.recordId, link.field),
      storageId,
    });
    await ctx.db.patch(link._id, { usedAt: Date.now() });
  },
});
