// Builds an AI SDK language model for whichever provider the admin picked.
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { ProviderName } from "../schema";

export const PROVIDER_LABELS: Record<ProviderName, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI",
  google: "Google (Gemini)",
};

export function languageModel(provider: ProviderName, model: string, apiKey: string) {
  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey })(model);
    case "openai":
      return createOpenAI({ apiKey })(model);
    case "google":
      return createGoogleGenerativeAI({ apiKey, baseURL: process.env.GOOGLE_BASE_URL || undefined })(model);
  }
}

// Prices are USD per million tokens. These are only the starting point, until the
// first automatic check (prices.ts) has run. Claude prices are Anthropic's published
// rates (Oct 2026), and Gemini's are Google's paid rates (Nov 2026). On Google's free
// tier nothing is billed, so the meter reads high.
// A model no source knows must be priced by the admin before it can be used, so the
// spend cap never counts it as free.
export const DEFAULT_PRICES = [
  { provider: "anthropic" as const, model: "claude-opus-5-5", name: "Claude Opus 5.5", inputPerMTok: 4, outputPerMTok: 20 },
  { provider: "anthropic" as const, model: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", inputPerMTok: 2, outputPerMTok: 10 },
  { provider: "anthropic" as const, model: "claude-haiku-5-5", name: "Claude Haiku 5.5", inputPerMTok: 0.1, outputPerMTok: 0.5 },
  { provider: "google" as const, model: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite", inputPerMTok: 0.3, outputPerMTok: 2.5 },
  { provider: "google" as const, model: "gemini-3.8-flash", name: "Gemini 3.8 Flash", inputPerMTok: 0.75, outputPerMTok: 3.75 },
  { provider: "google" as const, model: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", inputPerMTok: 0.25, outputPerMTok: 1.5 },
];

export const DEFAULT_MODEL = { provider: "anthropic" as const, model: "claude-opus-5-5" };
// What to use when the admin has a key for this provider but chose no model from it.
export const PROVIDER_DEFAULT_MODEL: Partial<Record<ProviderName, { provider: ProviderName; model: string }>> = {
  anthropic: DEFAULT_MODEL,
  google: { provider: "google", model: "gemini-3.5-flash-lite" },
};
export const DEFAULT_BUDGET_USD = 20;
