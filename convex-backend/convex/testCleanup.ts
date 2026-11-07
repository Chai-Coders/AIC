// After the AI Assistant's tests (tests/ai/README.md): removes the test admin and the
// drafts, versions, log rows and usage it made, so fake costs don't count on the spend
// meter. It only touches what belongs to that one account. Internal: the CLI can run it,
// the browser can't.
import { internalMutation } from "./_generated/server";

const TEST_ADMIN = "test@aic.local";
// The last characters of the fake Claude key in tests/ai/e2e.mjs.
const FAKE_KEY_END = "1234";

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const accounts = (await ctx.db.query("authAccounts").collect()).filter((a) => a.providerAccountId === TEST_ADMIN);
    const users = new Set(accounts.map((a) => a.userId as string));
    const drafts = (await ctx.db.query("changeSets").collect()).filter((d) => users.has(d.createdBy));
    const draftIds = new Set(drafts.map((d) => d._id as string));
    let deleted = 0;

    for (const row of await ctx.db.query("versions").collect()) {
      if (users.has(row.publishedBy)) {
        await ctx.db.delete(row._id);
        deleted += 1;
      }
    }
    for (const row of await ctx.db.query("auditLog").collect()) {
      const fromFakeFeeds = row.action === "prices.check" && JSON.stringify(row.detail).includes("claude-test");
      if ((row.userId && users.has(row.userId)) || (row.changeSetId && draftIds.has(row.changeSetId)) || fromFakeFeeds) {
        await ctx.db.delete(row._id);
        deleted += 1;
      }
    }
    for (const row of await ctx.db.query("usage").collect()) {
      if (row.changeSetId && draftIds.has(row.changeSetId)) {
        await ctx.db.delete(row._id);
        deleted += 1;
      }
    }
    for (const draft of drafts) {
      await ctx.db.delete(draft._id);
      deleted += 1;
    }

    const settings = await ctx.db.query("aiSettings").first();
    if (settings) {
      const providers = settings.providers.filter((p) => !(p.name === "anthropic" && p.last4 === FAKE_KEY_END));
      if (providers.length !== settings.providers.length) await ctx.db.patch(settings._id, { providers });
    }

    const sessions = await ctx.db.query("authSessions").collect();
    const tokens = await ctx.db.query("authRefreshTokens").collect();
    for (const account of accounts) {
      for (const session of sessions.filter((s) => s.userId === account.userId)) {
        for (const token of tokens.filter((t) => t.sessionId === session._id)) await ctx.db.delete(token._id);
        await ctx.db.delete(session._id);
      }
      await ctx.db.delete(account._id);
      await ctx.db.delete(account.userId);
    }
    return { deleted };
  },
});
