import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { randomToken, sha256 } from "./lib/tokens";

// AI apps connect to the MCP server (mcp.ts) with OAuth access tokens.

const TOUCH_EVERY_MS = 5 * 60 * 1000;

/** Checks an access token; returns the app's name, or null. */
export const authenticate = internalMutation({
  args: { accessHash: v.string() },
  handler: async (ctx, { accessHash }) => {
    const token = await ctx.db
      .query("oauthTokens")
      .withIndex("by_accessHash", (q) => q.eq("accessHash", accessHash))
      .first();
    if (!token || token.accessExpiresAt < Date.now()) return null;
    const user = await ctx.db.get(token.userId);
    if (!user) return null;
    const client = await ctx.db
      .query("oauthClients")
      .withIndex("by_clientId", (q) => q.eq("clientId", token.clientId))
      .first();
    if (!client) return null;
    const now = Date.now();
    if (!token.lastUsedAt || now - token.lastUsedAt > TOUCH_EVERY_MS) await ctx.db.patch(token._id, { lastUsedAt: now });
    return { app: client.name, clientId: client.clientId };
  },
});

/**
 * A token for testing the MCP server without OAuth, e.g. from MCP Inspector or
 * Claude Code. It lasts 30 days and shows up on the AI connection page, where
 * it can be disconnected.
 *   npx convex run oauth:createTestToken '{"email":"admin@example.com"}'
 */
export const createTestToken = internalMutation({
  args: { email: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, { email, name = "Test token (command line)" }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email.trim().toLowerCase()))
      .first();
    if (!user) throw new Error(`No admin with the email ${email}.`);
    const clientId = `cli-${randomToken(9)}`;
    const now = Date.now();
    await ctx.db.insert("oauthClients", { clientId, name, redirectUris: [], createdAt: now });
    const access = randomToken();
    await ctx.db.insert("oauthTokens", {
      clientId,
      userId: user._id,
      accessHash: await sha256(access),
      refreshHash: await sha256(randomToken()),
      accessExpiresAt: now + 30 * 24 * 60 * 60 * 1000,
      refreshExpiresAt: now + 30 * 24 * 60 * 60 * 1000,
      createdAt: now,
    });
    return `Bearer token for the MCP server (keep it secret): ${access}`;
  },
});
