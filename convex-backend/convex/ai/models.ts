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
      return createGoogleGenerativeAI({ apiKey })(model);
  }
}

// Prices are USD per million tokens and are the admin's to keep current on
// the settings page. Only Claude prices are filled in by default (from
// Anthropic's published rates, Oct 2026); any other model must be priced by
// the admin before it can be used, so the spend cap never counts it as free.
export const DEFAULT_PRICES = [
  { provider: "anthropic" as const, model: "claude-opus-5-5", inputPerMTok: 4, outputPerMTok: 20 },
  { provider: "anthropic" as const, model: "claude-sonnet-5-5", inputPerMTok: 2, outputPerMTok: 10 },
  { provider: "anthropic" as const, model: "claude-haiku-5-5", inputPerMTok: 0.1, outputPerMTok: 0.5 },
];

export const DEFAULT_MODEL = { provider: "anthropic" as const, model: "claude-opus-5-5" };
export const DEFAULT_BUDGET_USD = 20;
