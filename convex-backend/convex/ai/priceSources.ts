// Where model prices come from, and how to choose between them. Pure functions:
// prices.ts does the fetching and saving.
//
// Most trusted first:
// 1. The provider's own price page. Anthropic and Google publish theirs as text.
//    OpenAI's refuses automated requests.
// 2. Two independent public price lists, LiteLLM and OpenRouter, when they agree.
// 3. Otherwise the higher price, marked as unconfirmed: reading high stops the
//    assistant early, reading low could let spending pass the budget.
import type { ProviderName } from "../schema";

export type Quote = { provider: ProviderName; model: string; inputPerMTok: number; outputPerMTok: number; name?: string };
export type PriceSource = "official" | "agreed" | "unconfirmed";
export type Priced = Quote & { name: string; source: PriceSource; sourceLabel: string };

const MAX_PER_MTOK = 1000;
const AGREE_WITHIN = 0.01;
// A page read wrongly, or a typo in a list, looks like this. A real change is smaller.
const SUSPICIOUS_RATIO = 3;

const MODEL_ID = /^[a-z0-9][a-z0-9.-]{0,79}$/;
// Dated snapshots, and models that can't do this job (text and tool calls: Gemma has no tools).
const NOT_FOR_EDITING = /-\d{4}-\d{2}-\d{2}$|-\d{8}$|embed|image|tts|audio|realtime|transcri|live|robotics|computer-use|search|moderation|deep-research|codex|nano-banana|veo|imagen|dall|whisper|sora|-latest$|gemma|customtools/;

const keyOf = (q: { provider: string; model: string }) => `${q.provider}/${q.model}`;
const validRate = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0 && n <= MAX_PER_MTOK;
const validQuote = (q: Quote) => MODEL_ID.test(q.model) && !NOT_FOR_EDITING.test(q.model) && validRate(q.inputPerMTok) && validRate(q.outputPerMTok);
const perMillion = (perToken: unknown) => Math.round(Number(perToken) * 1e6 * 10000) / 10000;

/** Names come from outside, so only what a model's name needs gets through. */
export const cleanName = (name: unknown) => (typeof name === "string" && /^[\w .()+-]{1,80}$/.test(name.trim()) ? name.trim() : undefined);

const prettyName = (model: string) =>
  model
    .split("-")
    .map((part) => (/^(gpt|ai)$/.test(part) ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ");

// "| Claude Opus 5.5 | $4 / MTok | ... | $20 / MTok |"
export function parseAnthropicPage(page: string): Quote[] {
  const lines = page.split("\n");
  const header = lines.findIndex((l) => /^\|\s*Model\s*\|.*Base input tokens.*Output tokens/i.test(l));
  if (header < 0) return [];
  const columns = lines[header].split("|").map((c) => c.trim().toLowerCase());
  const input = columns.findIndex((c) => c.startsWith("base input"));
  const output = columns.findIndex((c) => c.startsWith("output"));
  const quotes: Quote[] = [];
  for (const line of lines.slice(header + 2)) {
    if (!line.startsWith("|")) break;
    const cells = line.split("|").map((c) => c.trim());
    // A price with tiers: the lower tier is what prompts this small pay.
    if (/for prompts over/i.test(cells[1])) continue;
    const name = cells[1].replace(/\(.*$/, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").trim();
    const dollars = (cell: string) => Number(cell?.match(/\$([\d.]+)/)?.[1]);
    quotes.push({
      provider: "anthropic",
      model: name.toLowerCase().replace(/[ .]/g, "-"),
      name,
      inputPerMTok: dollars(cells[input]),
      outputPerMTok: dollars(cells[output]),
    });
  }
  return quotes.filter(validQuote);
}

// "## Gemini 3.8 Flash {% id="gemini-3.8-flash" %}", then a table whose rows are a
// label, the free plan's price and the paid plan's price, each on a line of its own.
export function parseGooglePage(page: string): Quote[] {
  const sections = page.split(/^## /m).slice(1);
  const paid = (section: string, label: string) => {
    const row = section.match(new RegExp(`\\*\\s*${label}[^\\n]*\\n\\s*\\*[^\\n]*\\n\\s*\\*\\s*([^\\n]*)`));
    return Number(row?.[1].match(/\$([\d.]+)/)?.[1]);
  };
  return sections
    .flatMap((section): Quote[] => {
      const heading = section.match(/^(.+?)\s*\{%\s*id="([^"]+)"/);
      if (!heading) return [];
      return [{ provider: "google", model: heading[2], name: heading[1].trim(), inputPerMTok: paid(section, "Input price"), outputPerMTok: paid(section, "Output price") }];
    })
    .filter(validQuote);
}

const LITELLM_PROVIDERS: Record<string, ProviderName> = { anthropic: "anthropic", gemini: "google", openai: "openai" };

export function parseLiteLLM(list: Record<string, any>, now = Date.now()): Quote[] {
  return Object.entries(list)
    .flatMap(([key, m]): Quote[] => {
      const provider = LITELLM_PROVIDERS[m?.litellm_provider];
      if (!provider || m.mode !== "chat") return [];
      if (m.deprecation_date && Date.parse(m.deprecation_date) < now) return [];
      return [{ provider, model: key.split("/").pop()!, inputPerMTok: perMillion(m.input_cost_per_token), outputPerMTok: perMillion(m.output_cost_per_token) }];
    })
    .filter(validQuote);
}

const OPENROUTER_PROVIDERS: Record<string, ProviderName> = { anthropic: "anthropic", google: "google", openai: "openai" };

export function parseOpenRouter(list: { data?: any[] }): Quote[] {
  return (list.data ?? [])
    .flatMap((m): Quote[] => {
      const [owner, id] = String(m?.id).split("/");
      const provider = OPENROUTER_PROVIDERS[owner];
      // ":batch" and ":free" are other ways of buying the same model.
      if (!provider || !id || id.includes(":")) return [];
      if (m.architecture?.output_modalities && !m.architecture.output_modalities.includes("text")) return [];
      return [{
        provider,
        // OpenRouter writes claude-opus-5.5 where Anthropic's own id is claude-opus-5-5.
        model: provider === "anthropic" ? id.replace(/\./g, "-") : id,
        name: cleanName(String(m.name).replace(/^[^:]*:\s*/, "")),
        inputPerMTok: perMillion(m.pricing?.prompt),
        outputPerMTok: perMillion(m.pricing?.completion),
      }];
    })
    .filter(validQuote);
}

const within = (a: number, b: number, ratio: number) => Math.max(a, b) <= Math.min(a, b) * ratio;
const closeTo = (a: Quote, b: Quote, ratio: number) => within(a.inputPerMTok, b.inputPerMTok, ratio) && within(a.outputPerMTok, b.outputPerMTok, ratio);

export const OFFICIAL_LABEL: Partial<Record<ProviderName, string>> = { anthropic: "Anthropic's price page", google: "Google's price page" };

/**
 * One price per model. The lists decide which models exist: a price page only
 * confirms them, because its names (like "Claude Opus 3") aren't always API ids.
 */
export function choosePrices(official: Quote[], listA: Quote[], listB: Quote[]): Priced[] {
  const index = (quotes: Quote[]) => new Map(quotes.map((q) => [keyOf(q), q]));
  const [fromPage, a, b] = [index(official), index(listA), index(listB)];
  return [...new Set([...a.keys(), ...b.keys()])].map((key) => {
    const qa = a.get(key);
    const qb = b.get(key);
    const base = (qa ?? qb)!;
    const page = fromPage.get(key);
    const named = { provider: base.provider, model: base.model, name: page?.name ?? qb?.name ?? qa?.name ?? prettyName(base.model) };
    const lists = [qa, qb].filter((q): q is Quote => !!q);
    if (page && lists.some((q) => closeTo(page, q, SUSPICIOUS_RATIO))) {
      return { ...named, inputPerMTok: page.inputPerMTok, outputPerMTok: page.outputPerMTok, source: "official" as const, sourceLabel: OFFICIAL_LABEL[base.provider]! };
    }
    if (qa && qb && closeTo(qa, qb, 1 + AGREE_WITHIN)) {
      return { ...named, inputPerMTok: qa.inputPerMTok, outputPerMTok: qa.outputPerMTok, source: "agreed" as const, sourceLabel: "LiteLLM and OpenRouter agree" };
    }
    return {
      ...named,
      inputPerMTok: Math.max(...lists.map((q) => q.inputPerMTok)),
      outputPerMTok: Math.max(...lists.map((q) => q.outputPerMTok)),
      source: "unconfirmed" as const,
      sourceLabel: lists.length === 2 ? "LiteLLM and OpenRouter differ: using the higher" : `Only ${qa ? "LiteLLM" : "OpenRouter"} lists it`,
    };
  });
}

/** An unconfirmed price far from the last known one isn't believed yet. */
export const isSuspicious = (next: Priced, previous?: { inputPerMTok: number; outputPerMTok: number }) =>
  next.source === "unconfirmed" && !!previous && !closeTo(next, previous as Quote, SUSPICIOUS_RATIO);
