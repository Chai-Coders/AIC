// Keeps model prices and names current: every day, or when the admin asks. A source
// that fails changes nothing, and prices the admin set themselves always win. API keys
// only ever go to their own provider, to ask which models the key can use.
import { v } from "convex/values";
import { action, internalAction, internalMutation, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireAdmin } from "../lib/access";
import { providerName, type ProviderName } from "../schema";
import { audit } from "./audit";
import { choosePrices, cleanName, isSuspicious, parseAnthropicPage, parseGooglePage, parseLiteLLM, parseOpenRouter, type Priced, type Quote } from "./priceSources";
import { providerKey } from "./settings";

const FETCH_TIMEOUT_MS = 20_000;
const MAX_BYTES = 12_000_000;

// PRICE_FEED_BASE_URL is for the tests' fake services.
const url = (real: string, fake: string) => (process.env.PRICE_FEED_BASE_URL ? `${process.env.PRICE_FEED_BASE_URL}/${fake}` : real);
const SOURCES = () => [
  { label: "Anthropic's price page", url: url("https://docs.anthropic.com/en/docs/about-claude/pricing.md", "anthropic.md"), read: (text: string) => parseAnthropicPage(text), kind: "official" as const },
  { label: "Google's price page", url: url("https://ai.google.dev/gemini-api/docs/pricing.md.txt", "google.md"), read: (text: string) => parseGooglePage(text), kind: "official" as const },
  { label: "LiteLLM", url: url("https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json", "litellm.json"), read: (text: string) => parseLiteLLM(JSON.parse(text)), kind: "a" as const },
  { label: "OpenRouter", url: url("https://openrouter.ai/api/v1/models", "openrouter.json"), read: (text: string) => parseOpenRouter(JSON.parse(text)), kind: "b" as const },
];

async function fetchText(address: string, headers: Record<string, string> = {}) {
  const res = await fetch(address, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new Error("too large");
  return text;
}

/** The models this key can use, with the provider's own names. Null if it can't say. */
async function modelsForKey(provider: ProviderName, apiKey: string): Promise<Map<string, string | undefined> | null> {
  const asMap = (rows: [string, unknown][]) => new Map(rows.map(([id, name]) => [id, cleanName(name)]));
  try {
    if (provider === "google") {
      const base = process.env.GOOGLE_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
      const { models } = JSON.parse(await fetchText(`${base}/models?pageSize=1000`, { "x-goog-api-key": apiKey }));
      return asMap(models.filter((m: any) => m.supportedGenerationMethods?.includes("generateContent")).map((m: any) => [String(m.name).replace(/^models\//, ""), m.displayName]));
    }
    if (provider === "anthropic") {
      const base = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com/v1";
      const { data } = JSON.parse(await fetchText(`${base}/models?limit=1000`, { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }));
      return asMap(data.map((m: any) => [m.id, m.display_name]));
    }
    const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const { data } = JSON.parse(await fetchText(`${base}/models`, { authorization: `Bearer ${apiKey}` }));
    return asMap(data.map((m: any) => [m.id, undefined]));
  } catch {
    return null;
  }
}

async function check(ctx: ActionCtx) {
  const failed: string[] = [];
  const quotes = { official: [] as Quote[], a: [] as Quote[], b: [] as Quote[] };
  await Promise.all(
    SOURCES().map(async (source) => {
      try {
        const read = source.read(await fetchText(source.url));
        // A page that loads but reads as nothing has changed its layout.
        if (read.length === 0) throw new Error("no prices found");
        quotes[source.kind].push(...read);
      } catch {
        failed.push(source.label);
      }
    }),
  );
  const prices = choosePrices(quotes.official, quotes.a, quotes.b);

  const keyed: ProviderName[] = await ctx.runQuery(internal.ai.settings.keyedProviders, {});
  const lists = await Promise.all(keyed.map(async (provider) => [provider, await modelsForKey(provider, await providerKey(ctx, provider))] as const));
  const forKey = new Map(lists);
  const rows = prices.map((p) => {
    const list = forKey.get(p.provider);
    return { ...p, name: list?.get(p.model) ?? p.name, ...(list ? { available: list.has(p.model) } : {}) };
  });
  return await ctx.runMutation(internal.ai.prices.store, { rows, failed });
}

export const store = internalMutation({
  args: {
    rows: v.array(v.object({
      provider: providerName,
      model: v.string(),
      name: v.string(),
      inputPerMTok: v.number(),
      outputPerMTok: v.number(),
      source: v.union(v.literal("official"), v.literal("agreed"), v.literal("unconfirmed")),
      sourceLabel: v.string(),
      available: v.optional(v.boolean()),
    })),
    failed: v.array(v.string()),
  },
  handler: async (ctx, { rows, failed }) => {
    const now = Date.now();
    const existing = await ctx.db.query("modelPrices").collect();
    const known = new Map(existing.map((r) => [`${r.provider}/${r.model}`, r]));
    const changed: string[] = [];
    const held: string[] = [];
    for (const row of rows) {
      const previous = known.get(`${row.provider}/${row.model}`);
      known.delete(`${row.provider}/${row.model}`);
      if (isSuspicious(row as Priced, previous)) {
        held.push(row.model);
        await ctx.db.patch(previous!._id, { checkedAt: now, held: true, available: row.available });
        continue;
      }
      if (previous && (previous.inputPerMTok !== row.inputPerMTok || previous.outputPerMTok !== row.outputPerMTok)) {
        changed.push(`${row.model}: $${previous.inputPerMTok}/$${previous.outputPerMTok} to $${row.inputPerMTok}/$${row.outputPerMTok}`);
      }
      if (previous) await ctx.db.replace(previous._id, { ...row, checkedAt: now });
      else await ctx.db.insert("modelPrices", { ...row, checkedAt: now });
    }
    // Gone from every source. Only when all of them answered, and never one in use.
    const settings = await ctx.db.query("aiSettings").first();
    const inUse = new Set([settings?.editorModel.model, settings?.reviewerModel.model]);
    if (failed.length === 0) {
      for (const row of known.values()) if (!inUse.has(row.model)) await ctx.db.delete(row._id);
    }
    const priceCheck = { at: now, failed, changed, held, count: rows.length };
    if (settings) await ctx.db.patch(settings._id, { priceCheck });
    await audit(ctx, { action: "prices.check", detail: priceCheck });
    return priceCheck;
  },
});

/** Every day (crons.ts). */
export const refresh = internalAction({
  args: {},
  handler: async (ctx) => {
    await check(ctx);
  },
});

/** The Check now button. */
export const refreshNow = action({
  args: {},
  handler: async (ctx): Promise<{ failed: string[]; changed: string[]; held: string[]; count: number }> => {
    await requireAdmin(ctx);
    return await check(ctx);
  },
});
