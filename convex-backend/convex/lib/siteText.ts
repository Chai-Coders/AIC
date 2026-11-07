import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
// The website's list of editable texts, with their labels and the wording
// written in its code. Shared so the history and the AI tools always know
// the same texts the website and the CMS's Site text page show.
import { PAGES, SHARED } from "../../../frontend/src/content/registry.js";

// Website text as version history sees it: every text is a record whose id
// is its key ("home.hero.title") and whose one field, `value`, is the text
// visitors see now: the published edit, or the wording in the website's code.
// Writing the code's wording back removes the edit.

export type TextKind = "line" | "text" | "rich" | "list";
export type TextDef = { key: string; label: string; kind: TextKind; value: string; page: string; group: string };

type RegistryField = { key: string; label: string; kind: TextKind; value: string };
type RegistryGroup = { name: string; fields: RegistryField[] };
type RegistryPage = { id: string; name: string; groups: RegistryGroup[] };

const pages = PAGES as RegistryPage[];
const shared = SHARED as RegistryGroup[];

export const TEXTS = new Map<string, TextDef>();
for (const group of shared) {
  for (const f of group.fields) TEXTS.set(f.key, { ...f, page: "Every page", group: group.name });
}
for (const page of pages) {
  for (const group of page.groups) {
    for (const f of group.fields) {
      if (!TEXTS.has(f.key)) TEXTS.set(f.key, { ...f, page: page.name, group: group.name });
    }
  }
}

/** Website page names and ids, for the AI tools' page filter. */
export const TEXT_PAGES = [{ id: "shared", name: "Every page" }, ...pages.map((p) => ({ id: p.id, name: p.name }))];

/** Finds a website page by id or name ("home", "Who we are"); null if none matches. */
export function textPage(query: string) {
  const q = query.trim().toLowerCase();
  return TEXT_PAGES.find((p) => p.id.toLowerCase() === q || p.name.toLowerCase() === q) ?? null;
}

export const TEXT_FORMAT: Record<TextKind, string> = {
  line: "one line",
  text: "a paragraph",
  rich: "a paragraph; *words* in italics, **words** in bold",
  list: "one item per line",
};

// Text keys look like "home.programs.0.factLabel": words and numbers joined by
// dots.
const KEY = /^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*$/;
const MAX_KEY = 100;
export const MAX_TEXT = 5000;

// These can be blank, which takes the icon off the footer. Any other link has
// buttons depending on it.
const OPTIONAL_LINKS = new Set(["links.facebook", "links.x", "links.linkedin", "links.youtube", "links.instagram"]);

/** A text key's shape, before looking it up. Throws a message. */
export function checkTextKey(key: string) {
  if (key.length > MAX_KEY || !KEY.test(key)) {
    throw new ConvexError(`"${key}" is not a valid text name.`);
  }
}

/**
 * The same rules for everything that writes website text: the Site text page,
 * AI apps (MCP) and the AI Assistant. `null` means the wording in the code.
 * Throws a message.
 */
export function checkTextValue(key: string, value: string | null) {
  checkTextKey(key);
  if (!TEXTS.has(key)) {
    throw new ConvexError(`The website has no text "${key}". Reload the page and try again.`);
  }
  if (value === null) return;
  if (value.length > MAX_TEXT) {
    throw new ConvexError(`"${key}" can be at most ${MAX_TEXT} characters.`);
  }
  if (key.startsWith("links.")) {
    const blank = !value.trim();
    if (blank ? !OPTIONAL_LINKS.has(key) : !/^https?:\/\/\S+$/i.test(value.trim())) {
      throw new ConvexError(`"${key}" must be a full web address, like https://example.com.`);
    }
  }
}

/** A text as a record: `{ _id: key, key, value }`, or null for a key the website doesn't have. */
export async function textDoc(ctx: QueryCtx, key: string) {
  const def = TEXTS.get(key);
  if (!def) return null;
  const row = await ctx.db
    .query("siteText")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  return { _id: key, key, value: row?.value ?? def.value };
}

/** Every text as a record. */
export async function allTextDocs(ctx: QueryCtx) {
  const edited = new Map((await ctx.db.query("siteText").collect()).map((r) => [r.key, r.value]));
  return [...TEXTS.values()].map((def) => ({ _id: def.key, key: def.key, value: edited.get(def.key) ?? def.value }));
}

/** Shows `value` for the text `key` on the website (the code's wording removes the edit). */
export async function writeText(ctx: MutationCtx, key: string, value: unknown) {
  const def = TEXTS.get(key);
  if (!def) throw new ConvexError(`The website has no text "${key}".`);
  const text = typeof value === "string" ? value : "";
  const row = await ctx.db
    .query("siteText")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (text === def.value) {
    if (row) await ctx.db.delete(row._id);
  } else if (row) {
    await ctx.db.patch(row._id, { value: text, updatedAt: Date.now() });
  } else {
    await ctx.db.insert("siteText", { key, value: text, updatedAt: Date.now() });
  }
}

/** "Home · Hero": where a text is, for history and the AI. */
export function textTitle(key: string) {
  const def = TEXTS.get(key);
  return def ? `${def.page} · ${def.group}` : key;
}
