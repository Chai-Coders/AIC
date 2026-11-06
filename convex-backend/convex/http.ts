import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { mcpOther, mcpPost, preflight } from "./mcp";
import { authorizationServer, protectedResource, register, token } from "./oauth";

const http = httpRouter();

auth.addHttpRoutes(http);

// GET /img/<imageId>?w=<width>: the smallest stored copy of a picture that is
// at least `w` pixels wide. A picture never changes once uploaded (replacing
// it creates a new id), so browsers and proxies may cache it for a year.
http.route({
  pathPrefix: "/img/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const imageId = url.pathname.slice("/img/".length);
    const w = Number(url.searchParams.get("w"));
    const storageId = await ctx.runQuery(internal.images.pickVariant, {
      imageId,
      width: Number.isFinite(w) && w > 0 ? w : undefined,
    });
    const blob = storageId && (await ctx.storage.get(storageId));
    if (!blob) return new Response("Not found", { status: 404 });
    return new Response(blob, {
      headers: {
        "Content-Type": blob.type || "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

// The MCP server for AI apps (see mcp.ts).
http.route({ path: "/mcp", method: "POST", handler: mcpPost });
http.route({ path: "/mcp", method: "GET", handler: mcpOther });
http.route({ path: "/mcp", method: "DELETE", handler: mcpOther });
http.route({ path: "/mcp", method: "OPTIONS", handler: preflight });

// OAuth for AI apps (see oauth.ts). The sign-in page itself is in the CMS.
for (const path of ["/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/mcp"]) {
  http.route({ path, method: "GET", handler: protectedResource });
  http.route({ path, method: "OPTIONS", handler: preflight });
}
for (const path of ["/.well-known/oauth-authorization-server", "/.well-known/oauth-authorization-server/mcp"]) {
  http.route({ path, method: "GET", handler: authorizationServer });
  http.route({ path, method: "OPTIONS", handler: preflight });
}
http.route({ path: "/oauth/register", method: "POST", handler: register });
http.route({ path: "/oauth/register", method: "OPTIONS", handler: preflight });
http.route({ path: "/oauth/token", method: "POST", handler: token });
http.route({ path: "/oauth/token", method: "OPTIONS", handler: preflight });

export default http;
