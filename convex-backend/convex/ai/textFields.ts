// Which website texts exist. They are defined in the website's own registry, which
// is plain data, so the backend bundles it instead of keeping a second list. A key
// added there is known here once the backend is redeployed.
import { FIELDS, PAGES, SHARED } from "../../../frontend/src/content/registry.js";
import { SECTION_MAP } from "../../../frontend/src/content/sectionMap.js";

type Field = { key: string; label: string; kind: string; value: string };
type Group = { name: string; fields: Field[] };

const fields = FIELDS as unknown as Record<string, Field>;

// Each key's page and group, for search results and the admin.
const places = new Map<string, { page: string; pageId: string; path: string | null; group: string }>();
for (const group of SHARED as unknown as Group[]) {
  for (const field of group.fields) places.set(field.key, { page: "All pages", pageId: "shared", path: null, group: group.name });
}
for (const page of PAGES as unknown as { id: string; name: string; path: string; groups: Group[] }[]) {
  for (const group of page.groups) {
    for (const field of group.fields) places.set(field.key, { page: page.name, pageId: page.id, path: page.path, group: group.name });
  }
}

export const textField = (key: string): Field | undefined => (Object.hasOwn(fields, key) ? fields[key] : undefined);

const plain = (text: string) => text.replace(/\*+/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/** Every text matching the filters, with what it shows now given `published` values. */
export function findTextFields(published: Record<string, string>, { query, page }: { query?: string; page?: string }) {
  const needle = query ? plain(query) : "";
  const wanted = page?.trim().toLowerCase();
  const out = [];
  for (const field of Object.values(fields)) {
    const place = places.get(field.key);
    if (wanted && place?.pageId.toLowerCase() !== wanted && place?.page.toLowerCase() !== wanted) continue;
    const value = published[field.key] ?? field.value;
    if (needle && !plain(`${field.key} ${field.label} ${value}`).includes(needle)) continue;
    out.push({ key: field.key, label: field.label, kind: field.kind, value, edited: field.key in published, page: place?.page, path: place?.path ?? undefined, group: place?.group });
  }
  return out;
}

/** The key of the text showing exactly this, if there's just one. */
export function textKeyForValue(text: string, published: Record<string, string>) {
  const needle = plain(text);
  if (!needle) return null;
  const matches = Object.values(fields).filter((field) => plain(published[field.key] ?? field.value) === needle);
  return matches.length === 1 ? matches[0].key : null;
}

type PagePart = { id: string; label: string };
const pageParts = SECTION_MAP as unknown as Record<string, PagePart[]>;

export const pagesWithParts = () => Object.keys(pageParts);
export const partsOfPage = (page: string): PagePart[] | undefined => (Object.hasOwn(pageParts, page) ? pageParts[page] : undefined);
