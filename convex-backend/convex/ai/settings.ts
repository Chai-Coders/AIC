// Agent settings: provider API keys (encrypted), model choice, monthly budget
// and price table. Keys are write-only from the browser: queries return the
// last 4 characters only.
import { ConvexError, v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query, type QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { requireAdmin } from "../lib/access";
import { modelRef, providerName, type ModelRef, type ProviderName } from "../schema";
import { decrypt, encrypt } from "./crypto";
import { DEFAULT_BUDGET_USD, DEFAULT_MODEL, DEFAULT_PRICES, PROVIDER_DEFAULT_MODEL, PROVIDER_LABELS } from "./models";
import { audit } from "./audit";

/**
 * Fills in what a saved row can lack: default prices for a provider with none yet,
 * and a model the saved keys can actually use. Otherwise saving only a Gemini key
 * would leave the assistant on Claude, failing for want of a Claude key.
 */
function withUsableModels<T extends Pick<Doc<"aiSettings">, "providers" | "editorModel" | "reviewerModel" | "priceTable">>(row: T): T {
  const usable = (ref: ModelRef) => {
    if (row.providers.length === 0 || row.providers.some((p) => p.name === ref.provider)) return ref;
    return row.providers.map((p) => PROVIDER_DEFAULT_MODEL[p.name]).find(Boolean) ?? ref;
  };
  return { ...row, editorModel: usable(row.editorModel), reviewerModel: usable(row.reviewerModel) };
}

type PriceRow = Doc<"aiSettings">["priceTable"][number] & Partial<Pick<Doc<"modelPrices">, "name" | "sourceLabel" | "available" | "held" | "checkedAt">>;

/**
 * The price of every known model: what the admin set, then the automatic check, then
 * the built-in defaults. An older saved price for a model nothing else knows about
 * can only have been entered by hand, so it counts as the admin's.
 */
function mergePrices(saved: Doc<"aiSettings">["priceTable"], catalog: Doc<"modelPrices">[]): PriceRow[] {
  const merged = new Map<string, PriceRow>();
  const put = (row: PriceRow) => merged.set(`${row.provider}/${row.model}`, row);
  for (const p of DEFAULT_PRICES) put({ ...p, source: "default", sourceLabel: "Built in, not checked yet" });
  for (const p of saved) {
    if (p.source !== "admin" && merged.has(`${p.provider}/${p.model}`)) continue;
    put({ ...p, source: "admin", sourceLabel: "Your own price" });
  }
  for (const { _id, _creationTime, ...row } of catalog) {
    const current = merged.get(`${row.provider}/${row.model}`);
    if (current?.source === "admin") merged.set(`${row.provider}/${row.model}`, { ...current, name: row.name, available: row.available });
    else put(row);
  }
  return [...merged.values()];
}

/** The settings row, or the defaults when none has been saved yet. */
export async function loadSettings(ctx: QueryCtx): Promise<Omit<Doc<"aiSettings">, "_id" | "_creationTime" | "priceTable"> & { priceTable: PriceRow[] }> {
  const row = await ctx.db.query("aiSettings").first();
  const catalog = await ctx.db.query("modelPrices").collect();
  if (row) return withUsableModels({ ...row, priceTable: mergePrices(row.priceTable, catalog) });
  return {
    providers: [],
    editorModel: DEFAULT_MODEL,
    reviewerModel: DEFAULT_MODEL,
    monthlyBudgetUsd: DEFAULT_BUDGET_USD,
    priceTable: mergePrices([], catalog),
    pricesUpdatedAt: 0,
    updatedAt: 0,
  };
}

export function priceFor(settings: { priceTable: Doc<"aiSettings">["priceTable"] }, ref: ModelRef) {
  return settings.priceTable.find((p) => p.provider === ref.provider && p.model === ref.model) ?? null;
}

/** Settings for the CMS settings page and model picker. No secrets. */
export const get = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const s = await loadSettings(ctx);
    return {
      providers: (Object.keys(PROVIDER_LABELS) as ProviderName[]).map((name) => {
        const saved = s.providers.find((p) => p.name === name);
        return { name, label: PROVIDER_LABELS[name], configured: !!saved, last4: saved?.last4 ?? null, updatedAt: saved?.updatedAt ?? null };
      }),
      editorModel: s.editorModel,
      reviewerModel: s.reviewerModel,
      monthlyBudgetUsd: s.monthlyBudgetUsd,
      priceTable: s.priceTable,
      pricesUpdatedAt: s.pricesUpdatedAt || null,
      priceCheck: s.priceCheck ?? null,
      encryptionReady: !!process.env.AI_SETTINGS_KEY,
    };
  },
});

async function upsert(ctx: Parameters<typeof loadSettings>[0] & { db: any }, patch: Partial<Doc<"aiSettings">>) {
  const row = await ctx.db.query("aiSettings").first();
  const now = Date.now();
  if (row) {
    await ctx.db.patch(row._id, { ...patch, updatedAt: now });
  } else {
    // Only the admin's own prices are stored here.
    await ctx.db.insert("aiSettings", { ...(await loadSettings(ctx)), priceTable: [], ...patch, updatedAt: now });
  }
}

function checkModel(m: ModelRef) {
  if (!m.model.trim()) throw new ConvexError("Please enter a model name.");
  return { provider: m.provider, model: m.model.trim() };
}

export const save = mutation({
  args: {
    editorModel: v.optional(modelRef),
    reviewerModel: v.optional(modelRef),
    monthlyBudgetUsd: v.optional(v.number()),
    priceTable: v.optional(
      v.array(v.object({ provider: providerName, model: v.string(), inputPerMTok: v.number(), outputPerMTok: v.number() })),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAdmin(ctx);
    const patch: Partial<Doc<"aiSettings">> = {};
    if (args.editorModel) patch.editorModel = checkModel(args.editorModel);
    if (args.reviewerModel) patch.reviewerModel = checkModel(args.reviewerModel);
    if (args.monthlyBudgetUsd !== undefined) {
      if (!(args.monthlyBudgetUsd >= 0) || args.monthlyBudgetUsd > 100000) {
        throw new ConvexError("The monthly budget must be between 0 and 100,000 USD.");
      }
      patch.monthlyBudgetUsd = args.monthlyBudgetUsd;
    }
    if (args.priceTable) {
      for (const p of args.priceTable) {
        if (!p.model.trim() || !(p.inputPerMTok >= 0) || !(p.outputPerMTok >= 0)) {
          throw new ConvexError("Every price needs a model name and prices of 0 or more.");
        }
        // A free model would never count towards the spend cap.
        if (p.inputPerMTok === 0 && p.outputPerMTok === 0) {
          throw new ConvexError(`Please enter a price for ${p.model}; its cost can't be tracked at 0.`);
        }
      }
      patch.priceTable = args.priceTable.map((p) => ({ ...p, model: p.model.trim(), source: "admin" }));
      patch.pricesUpdatedAt = Date.now();
    }
    await upsert(ctx, patch);
    await audit(ctx, { userId, action: "settings.save", detail: { ...args } });
  },
});

/** Saves a provider API key. An action, so the encryption IV is truly random. */
export const setProviderKey = action({
  args: { provider: providerName, apiKey: v.string() },
  handler: async (ctx, { provider, apiKey }) => {
    const userId = await requireAdmin(ctx);
    const key = apiKey.trim();
    if (key.length < 8) throw new ConvexError("That doesn't look like an API key.");
    const sealed = await encrypt(key);
    await ctx.runMutation(internal.ai.settings.storeProviderKey, { userId, provider, ...sealed, last4: key.slice(-4) });
  },
});

export const removeProviderKey = mutation({
  args: { provider: providerName },
  handler: async (ctx, { provider }) => {
    const userId = await requireAdmin(ctx);
    const s = await loadSettings(ctx);
    await upsert(ctx, { providers: s.providers.filter((p) => p.name !== provider) });
    await audit(ctx, { userId, action: "settings.removeKey", detail: { provider } });
  },
});

export const storeProviderKey = internalMutation({
  args: { userId: v.id("users"), provider: providerName, ciphertext: v.string(), iv: v.string(), last4: v.string() },
  handler: async (ctx, { userId, provider, ciphertext, iv, last4 }) => {
    const s = await loadSettings(ctx);
    const providers = s.providers.filter((p) => p.name !== provider);
    providers.push({ name: provider, ciphertext, iv, last4, updatedAt: Date.now() });
    await upsert(ctx, { providers });
    // Never log the key itself.
    await audit(ctx, { userId, action: "settings.setKey", detail: { provider, last4 } });
    // So the model lists show what this key can use straight away.
    await ctx.scheduler.runAfter(0, internal.ai.prices.refresh, {});
  },
});

export const keyedProviders = internalQuery({
  args: {},
  handler: async (ctx) => (await loadSettings(ctx)).providers.map((p) => p.name),
});

/** Encrypted key for a provider (server only). */
export const sealedKey = internalQuery({
  args: { provider: providerName },
  handler: async (ctx, { provider }) => {
    const s = await loadSettings(ctx);
    const p = s.providers.find((x) => x.name === provider);
    return p ? { ciphertext: p.ciphertext, iv: p.iv } : null;
  },
});

/** Decrypted API key, for use inside actions only. Never return it to a client. */
export async function providerKey(ctx: { runQuery: any }, provider: ProviderName) {
  const sealed = await ctx.runQuery(internal.ai.settings.sealedKey, { provider });
  if (!sealed) {
    throw new ConvexError(`No API key is saved for ${PROVIDER_LABELS[provider]}. Add one on the AI settings page.`);
  }
  return await decrypt(sealed);
}
