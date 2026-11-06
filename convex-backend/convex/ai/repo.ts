// A cached copy of the working branch, read by the code tools and the preview,
// so a chat doesn't call GitHub for every file. Files are only downloaded when
// their blob changed.
import { ConvexError, v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireAdmin } from "../lib/access";
import { blobText, branchHead, commitTree, githubBranch, githubConfigured } from "./github";
import { inEditableRoot, isSecretPath } from "./protected";

const FRESH_FOR_MS = 5 * 60 * 1000;
const MAX_FILE_BYTES = 400_000;
const TEXT_FILE = /\.(jsx?|tsx?|mjs|cjs|css|json|html|md|svg|ya?ml|txt)$/i;
// frontend/public holds ~250 MB of site assets, and lockfiles aren't useful.
const SKIP = /^frontend\/public\/|(^|\/)(node_modules|dist)\/|(^|\/)package-lock\.json$/;

const wanted = (e: { path: string; size: number }) =>
  inEditableRoot(e.path) && !SKIP.test(e.path) && !isSecretPath(e.path) && TEXT_FILE.test(e.path) && e.size <= MAX_FILE_BYTES;

export const cacheState = internalQuery({
  args: {},
  handler: async (ctx) => {
    const cache = await ctx.db.query("repoCache").first();
    const rows = await ctx.db.query("repoFiles").collect();
    return { cache, shas: rows.map((r) => ({ path: r.path, sha: r.sha })) };
  },
});

export const storeFiles = internalMutation({
  args: { commitSha: v.string(), files: v.array(v.object({ path: v.string(), sha: v.string(), content: v.string() })) },
  handler: async (ctx, { commitSha, files }) => {
    for (const file of files) {
      const row = await ctx.db.query("repoFiles").withIndex("by_path", (q) => q.eq("path", file.path)).unique();
      if (row) await ctx.db.patch(row._id, { ...file, commitSha });
      else await ctx.db.insert("repoFiles", { ...file, commitSha });
    }
  },
});

export const finishSync = internalMutation({
  args: { branch: v.string(), commitSha: v.string(), keep: v.array(v.string()) },
  handler: async (ctx, { branch, commitSha, keep }) => {
    const keepSet = new Set(keep);
    for (const row of await ctx.db.query("repoFiles").collect()) {
      if (!keepSet.has(row.path)) await ctx.db.delete(row._id);
    }
    const state = { branch, commitSha, fetchedAt: Date.now(), fileCount: keep.length };
    const cache = await ctx.db.query("repoCache").first();
    if (cache) await ctx.db.patch(cache._id, state);
    else await ctx.db.insert("repoCache", state);
  },
});

/** Brings the cache up to the branch head. Returns false when GitHub isn't set up. */
export const sync = internalAction({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }): Promise<boolean> => {
    if (!githubConfigured()) return false;
    const branch = githubBranch();
    const { cache, shas } = await ctx.runQuery(internal.ai.repo.cacheState, {});
    if (!force && cache && cache.branch === branch && Date.now() - cache.fetchedAt < FRESH_FOR_MS) return true;
    const head = await branchHead(branch);
    const { entries } = await commitTree(head);
    const files = entries.filter(wanted);
    const known = new Map(shas.map((s) => [s.path, s.sha]));
    const stale = files.filter((f) => known.get(f.path) !== f.sha);
    // Small batches keep each mutation under Convex's write limits.
    for (let i = 0; i < stale.length; i += 10) {
      const batch = await Promise.all(
        stale.slice(i, i + 10).map(async (f) => ({ path: f.path, sha: f.sha, content: await blobText(f.sha) })),
      );
      await ctx.runMutation(internal.ai.repo.storeFiles, { commitSha: head, files: batch });
    }
    await ctx.runMutation(internal.ai.repo.finishSync, { branch, commitSha: head, keep: files.map((f) => f.path) });
    return true;
  },
});

export const refresh = action({
  args: {},
  handler: async (ctx): Promise<void> => {
    await requireAdmin(ctx);
    if (!(await ctx.runAction(internal.ai.repo.sync, { force: true }))) {
      throw new ConvexError("Code changes aren't set up: GITHUB_TOKEN and GITHUB_REPO are missing on the server.");
    }
  },
});

/**
 * The website's source, for the preview: paths relative to frontend/. Null
 * until the cache exists; the CMS then uses the copy bundled at build time.
 */
export const frontendSources = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const cache = await ctx.db.query("repoCache").first();
    if (!cache) return null;
    const rows = await ctx.db
      .query("repoFiles")
      .withIndex("by_path", (q) => q.gte("path", "frontend/").lt("path", "frontend0"))
      .collect();
    const files: Record<string, string> = {};
    for (const row of rows) {
      if (row.content !== null) files[row.path.slice("frontend/".length)] = row.content;
    }
    return { commitSha: cache.commitSha, branch: cache.branch, files };
  },
});
