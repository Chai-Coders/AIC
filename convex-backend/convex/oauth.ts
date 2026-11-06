import { ConvexError, v } from "convex/values";
import { httpAction, internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/access";
import { randomToken, sha256 } from "./lib/tokens";
import { CORS_HEADERS } from "./mcp";

// OAuth 2.1 for AI apps connecting to the MCP server (mcp.ts), as the MCP
// spec and Claude.ai / ChatGPT require:
//   /.well-known/oauth-protected-resource   which server to log in with
//   /.well-known/oauth-authorization-server  where the endpoints are
//   /oauth/register   apps register themselves (dynamic client registration)
//   <CMS>/oauth/authorize  the admin signs in to the CMS and clicks Allow
//   /oauth/token      code (with PKCE) -> access + refresh token, and refresh
// The password is only ever typed on the CMS sign-in page. Tokens and codes
// are stored as SHA-256 hashes.

const ACCESS_LIFETIME_MS = 60 * 60 * 1000;
const REFRESH_LIFETIME_MS = 60 * 24 * 60 * 60 * 1000;
const CODE_LIFETIME_MS = 10 * 60 * 1000;
const TOUCH_EVERY_MS = 5 * 60 * 1000;
const UNUSED_CLIENT_MS = 24 * 60 * 60 * 1000;

const site = () => (process.env.CONVEX_SITE_URL ?? "").replace(/\/$/, "");
const cms = () => (process.env.SITE_URL ?? "").replace(/\/$/, "");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS_HEADERS },
  });

const oauthError = (error: string, description: string, status = 400) => json({ error, error_description: description }, status);

// --- Discovery ---------------------------------------------------------------

export const protectedResource = httpAction(async () =>
  json({
    resource: `${site()}/mcp`,
    authorization_servers: [site()],
    bearer_methods_supported: ["header"],
    resource_name: "AIC IIITK website",
  }),
);

export const authorizationServer = httpAction(async () =>
  json({
    issuer: site(),
    authorization_endpoint: `${cms()}/oauth/authorize`,
    token_endpoint: `${site()}/oauth/token`,
    registration_endpoint: `${site()}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["cms"],
    authorization_response_iss_parameter_supported: true,
  }),
);

// --- Registration ------------------------------------------------------------

/**
 * Where an app may be sent back to after sign-in: https pages, the app's own
 * loopback address (desktop apps), or a private app scheme like
 * cursor://... (RFC 8252). Never javascript:, data: and the like.
 */
export function allowedRedirect(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.hash) return false;
  if (url.protocol === "https:") return true;
  if (url.protocol === "http:") return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  return /^[a-z][a-z0-9+-]*\.[a-z0-9+.-]+:$/i.test(url.protocol);
}

export const register = httpAction(async (ctx, request) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return oauthError("invalid_client_metadata", "The request body must be JSON.");
  }
  const redirectUris = body.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0 || redirectUris.length > 10) {
    return oauthError("invalid_redirect_uri", "Give between 1 and 10 redirect_uris.");
  }
  if (!redirectUris.every((u) => typeof u === "string" && u.length < 2000 && allowedRedirect(u))) {
    return oauthError("invalid_redirect_uri", "Redirect URIs must be https, a loopback http address, or a private app scheme.");
  }
  const name = typeof body.client_name === "string" && body.client_name.trim() ? body.client_name.trim().slice(0, 80) : "AI app";
  const clientId = await ctx.runMutation(internal.oauth.insertClient, { name, redirectUris: redirectUris as string[] });
  return json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: name,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    201,
  );
});

export const insertClient = internalMutation({
  args: { name: v.string(), redirectUris: v.array(v.string()) },
  handler: async (ctx, { name, redirectUris }) => {
    const clientId = `app-${randomToken(12)}`;
    await ctx.db.insert("oauthClients", { clientId, name, redirectUris, createdAt: Date.now() });
    return clientId;
  },
});

async function findClient(ctx: QueryCtx, clientId: string) {
  return await ctx.db
    .query("oauthClients")
    .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
    .first();
}

// --- Authorization (the CMS consent page) ------------------------------------

/** For the consent page: which app is asking, or why the request is invalid. */
export const clientInfo = query({
  args: { clientId: v.string(), redirectUri: v.string() },
  handler: async (ctx, { clientId, redirectUri }) => {
    await requireAdmin(ctx);
    const client = await findClient(ctx, clientId);
    if (!client) return { ok: false as const, problem: "This app is not registered. Start connecting again from the AI app." };
    if (!client.redirectUris.includes(redirectUri)) {
      return { ok: false as const, problem: "This sign-in link doesn’t match the app. Start connecting again from the AI app." };
    }
    return { ok: true as const, name: client.name, redirectHost: new URL(redirectUri).host || redirectUri };
  },
});

/** The admin clicked Allow: returns the address to send the browser back to. */
export const authorize = mutation({
  args: {
    clientId: v.string(),
    redirectUri: v.string(),
    codeChallenge: v.string(),
    codeChallengeMethod: v.string(),
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);
    const client = await findClient(ctx, args.clientId);
    if (!client || !client.redirectUris.includes(args.redirectUri)) {
      throw new ConvexError("This sign-in link doesn’t match the app. Start connecting again from the AI app.");
    }
    if (args.codeChallengeMethod !== "S256" || !/^[A-Za-z0-9_-]{43,128}$/.test(args.codeChallenge)) {
      throw new ConvexError("This app’s sign-in request is not secure enough (it needs PKCE with S256).");
    }
    const code = randomToken();
    await ctx.db.insert("oauthCodes", {
      codeHash: await sha256(code),
      clientId: client.clientId,
      userId,
      redirectUri: args.redirectUri,
      codeChallenge: args.codeChallenge,
      expiresAt: Date.now() + CODE_LIFETIME_MS,
    });
    const back = new URL(args.redirectUri);
    back.searchParams.set("code", code);
    if (args.state) back.searchParams.set("state", args.state);
    back.searchParams.set("iss", site());
    return back.toString();
  },
});

// --- Tokens ------------------------------------------------------------------

export const exchangeCode = internalMutation({
  args: { codeHash: v.string(), clientId: v.string(), redirectUri: v.string(), verifierChallenge: v.string() },
  handler: async (ctx, args) => {
    const code = await ctx.db
      .query("oauthCodes")
      .withIndex("by_codeHash", (q) => q.eq("codeHash", args.codeHash))
      .first();
    if (!code) return { error: "invalid_grant", description: "The sign-in code is not valid. Please connect again." };
    // A code works once.
    await ctx.db.delete(code._id);
    if (code.expiresAt < Date.now()) return { error: "invalid_grant", description: "The sign-in code has expired. Please connect again." };
    if (code.clientId !== args.clientId || code.redirectUri !== args.redirectUri) {
      return { error: "invalid_grant", description: "The sign-in code was issued to a different app." };
    }
    if (code.codeChallenge !== args.verifierChallenge) {
      return { error: "invalid_grant", description: "The PKCE code_verifier does not match." };
    }
    return { tokens: await issueTokens(ctx, code.clientId, code.userId) };
  },
});

async function issueTokens(ctx: MutationCtx, clientId: string, userId: Id<"users">, replace?: Id<"oauthTokens">) {
  const access = randomToken();
  const refresh = randomToken();
  const now = Date.now();
  const row = {
    accessHash: await sha256(access),
    refreshHash: await sha256(refresh),
    accessExpiresAt: now + ACCESS_LIFETIME_MS,
    refreshExpiresAt: now + REFRESH_LIFETIME_MS,
  };
  if (replace) await ctx.db.patch(replace, row);
  else await ctx.db.insert("oauthTokens", { clientId, userId, createdAt: now, lastUsedAt: now, ...row });
  return { access_token: access, refresh_token: refresh, token_type: "Bearer", expires_in: ACCESS_LIFETIME_MS / 1000, scope: "cms" };
}

export const refresh = internalMutation({
  args: { refreshHash: v.string(), clientId: v.string() },
  handler: async (ctx, { refreshHash, clientId }) => {
    const token = await ctx.db
      .query("oauthTokens")
      .withIndex("by_refreshHash", (q) => q.eq("refreshHash", refreshHash))
      .first();
    if (!token || token.clientId !== clientId) return { error: "invalid_grant", description: "Please connect again." };
    if (token.refreshExpiresAt < Date.now() || !(await ctx.db.get(token.userId))) {
      await ctx.db.delete(token._id);
      return { error: "invalid_grant", description: "The connection has expired. Please connect again." };
    }
    // Each refresh token works once; the new pair replaces it.
    return { tokens: await issueTokens(ctx, clientId, token.userId, token._id) };
  },
});

export const token = httpAction(async (ctx, request) => {
  let params: URLSearchParams;
  const type = request.headers.get("Content-Type") ?? "";
  try {
    params = type.includes("application/json")
      ? new URLSearchParams(Object.entries((await request.json()) as Record<string, string>))
      : new URLSearchParams(await request.text());
  } catch {
    return oauthError("invalid_request", "Could not read the request.");
  }
  // Public clients send client_id in the body; accept it from Basic auth too.
  let clientId = params.get("client_id") ?? "";
  const basic = request.headers.get("Authorization")?.match(/^Basic\s+(.+)$/i)?.[1];
  if (!clientId && basic) {
    try {
      clientId = decodeURIComponent(atob(basic).split(":")[0]);
    } catch {
      // Fall through to the missing client_id error.
    }
  }
  if (!clientId) return oauthError("invalid_client", "client_id is required.", 401);

  const grant = params.get("grant_type");
  let result: { error: string; description: string } | { tokens: unknown };
  if (grant === "authorization_code") {
    const code = params.get("code");
    const verifier = params.get("code_verifier");
    const redirectUri = params.get("redirect_uri") ?? "";
    if (!code || !verifier) return oauthError("invalid_request", "code and code_verifier are required.");
    result = await ctx.runMutation(internal.oauth.exchangeCode, {
      codeHash: await sha256(code),
      clientId,
      redirectUri,
      verifierChallenge: await sha256(verifier),
    });
  } else if (grant === "refresh_token") {
    const refreshToken = params.get("refresh_token");
    if (!refreshToken) return oauthError("invalid_request", "refresh_token is required.");
    result = await ctx.runMutation(internal.oauth.refresh, { refreshHash: await sha256(refreshToken), clientId });
  } else {
    return oauthError("unsupported_grant_type", "Use authorization_code or refresh_token.");
  }
  if ("error" in result) return oauthError(result.error, result.description);
  return json(result.tokens);
});

// --- Checking tokens (mcp.ts) ------------------------------------------------

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
    const client = await findClient(ctx, token.clientId);
    if (!client) return null;
    const now = Date.now();
    if (!token.lastUsedAt || now - token.lastUsedAt > TOUCH_EVERY_MS) await ctx.db.patch(token._id, { lastUsedAt: now });
    return { app: client.name, clientId: client.clientId };
  },
});

// --- The AI connection page --------------------------------------------------

export const connectionInfo = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return { mcpUrl: `${site()}/mcp` };
  },
});

/** Apps that are connected now (have a token that can still be refreshed). */
export const connections = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const byClient = new Map<string, { clientId: string; name: string; connectedAt: number; lastUsedAt: number | null }>();
    for (const token of await ctx.db.query("oauthTokens").collect()) {
      if (token.refreshExpiresAt < now && token.accessExpiresAt < now) continue;
      const client = await findClient(ctx, token.clientId);
      if (!client) continue;
      const entry = byClient.get(client.clientId) ?? { clientId: client.clientId, name: client.name, connectedAt: token.createdAt, lastUsedAt: null };
      entry.connectedAt = Math.min(entry.connectedAt, token.createdAt);
      if (token.lastUsedAt && (!entry.lastUsedAt || token.lastUsedAt > entry.lastUsedAt)) entry.lastUsedAt = token.lastUsedAt;
      byClient.set(client.clientId, entry);
    }
    return [...byClient.values()].sort((a, b) => (b.lastUsedAt ?? b.connectedAt) - (a.lastUsedAt ?? a.connectedAt));
  },
});

/** Signs an app out: its tokens stop working at once. */
export const disconnect = mutation({
  args: { clientId: v.string() },
  handler: async (ctx, { clientId }) => {
    await requireAdmin(ctx);
    const tokens = await ctx.db
      .query("oauthTokens")
      .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
      .collect();
    for (const t of tokens) await ctx.db.delete(t._id);
    const client = await findClient(ctx, clientId);
    if (client) await ctx.db.delete(client._id);
  },
});

/**
 * Daily: removes expired sign-in codes, expired tokens, used or expired
 * upload links, and registered apps that never finished connecting.
 */
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    for (const code of await ctx.db.query("oauthCodes").collect()) if (code.expiresAt < now) await ctx.db.delete(code._id);
    for (const t of await ctx.db.query("oauthTokens").collect()) {
      if (t.refreshExpiresAt < now && t.accessExpiresAt < now) await ctx.db.delete(t._id);
    }
    for (const link of await ctx.db.query("uploadTokens").collect()) {
      if (link.expiresAt < now - UNUSED_CLIENT_MS) await ctx.db.delete(link._id);
    }
    for (const client of await ctx.db.query("oauthClients").collect()) {
      if (client.createdAt > now - UNUSED_CLIENT_MS) continue;
      const hasToken = await ctx.db
        .query("oauthTokens")
        .withIndex("by_clientId", (q) => q.eq("clientId", client.clientId))
        .first();
      if (!hasToken) await ctx.db.delete(client._id);
    }
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
