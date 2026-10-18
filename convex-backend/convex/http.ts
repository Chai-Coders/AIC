import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

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

export default http;
