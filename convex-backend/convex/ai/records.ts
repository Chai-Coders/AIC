// The content path's rules: which record fields the agent may change, how
// typed operations are applied to records, and how to compare them. Pure
// functions, used by the draft tools, the preview, Publish and rollback.
import { ConvexError } from "convex/values";
import { optionalUrl, text } from "../lib/validate";
import { teamCategory, type ContentOp, type ContentTable } from "../schema";
import { pagesWithParts, partsOfPage } from "./textFields";

type Doc = Record<string, any>;

type TextRule = { label: string; required?: boolean; max?: number; kind?: "url" | "link" | "date" | "category" | "background" };

// Text fields by table. Anything else (image ids, Mux ids, dates of creation)
// can't be set through update_record.
const TEXT_FIELDS: Record<ContentTable, Record<string, TextRule>> = {
  gallery: {
    subtext: { label: "Caption", max: 255 },
    altText: { label: "Alt text", max: 300 },
  },
  startups: {
    name: { label: "Startup name", required: true, max: 200 },
    description: { label: "Description", required: true },
    websiteUrl: { label: "Website", kind: "url" },
    altText: { label: "Alt text", max: 300 },
  },
  news: {
    title: { label: "Headline", required: true, max: 255 },
    subtitle: { label: "Summary", max: 300 },
    content: { label: "Article", required: true },
    publishedDate: { label: "Date", required: true, kind: "date" },
    altText: { label: "Alt text", max: 300 },
  },
  teamMembers: {
    name: { label: "Full name", required: true, max: 150 },
    role: { label: "Job title", required: true, max: 150 },
    category: { label: "Group", required: true, kind: "category" },
    bio: { label: "Short bio" },
    altText: { label: "Alt text", max: 300 },
  },
  backgroundVideo: {
    videoName: { label: "Video name", required: true, max: 200 },
  },
  pageSections: {
    page: { label: "Page", required: true, max: 60 },
    after: { label: "Place on the page", required: true, max: 60 },
    eyebrow: { label: "Small line above the heading", max: 120 },
    heading: { label: "Heading", required: true, max: 200 },
    body: { label: "Text", required: true, max: 5000 },
    altText: { label: "Alt text", max: 300 },
    buttonLabel: { label: "Button text", max: 80 },
    buttonUrl: { label: "Button address", kind: "link" },
    background: { label: "Background", kind: "background" },
  },
};

const IMAGE_FIELD: Partial<Record<ContentTable, string>> = {
  gallery: "imageId",
  startups: "logoId",
  news: "thumbnailId",
  teamMembers: "photoId",
  pageSections: "imageId",
};

// Only these tables have a manual order. News is ordered by date and the team
// by name, so their order comes from those fields.
const REORDERABLE: ContentTable[] = ["gallery", "startups", "pageSections"];

export const imageFieldOf = (table: ContentTable) => IMAGE_FIELD[table];
export const canReorder = (table: ContentTable) => REORDERABLE.includes(table);
export const textFieldsOf = (table: ContentTable) => Object.keys(TEXT_FIELDS[table]);

const CATEGORIES = teamCategory.members.map((m) => m.value as string);

/** The value to store for a text field, or throws a message for the model. */
export function checkTextField(table: ContentTable, field: string, value: unknown) {
  const rule = Object.hasOwn(TEXT_FIELDS[table], field) ? TEXT_FIELDS[table][field] : undefined;
  if (!rule) {
    throw new ConvexError(`"${field}" can't be edited on ${table}. Editable fields: ${textFieldsOf(table).join(", ")}.`);
  }
  if (typeof value !== "string") throw new ConvexError(`"${rule.label}" must be text.`);
  if (rule.kind === "url") return optionalUrl(value, rule.label);
  // A page on this site, or a full address.
  if (rule.kind === "link") {
    const link = value.trim();
    if (!link.startsWith("/")) return optionalUrl(link, rule.label);
    // "//host" is another website, and a page that doesn't exist helps nobody.
    const path = link.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
    if (link.startsWith("//") || link.startsWith("/\\") || !(partsOfPage(path) || path.startsWith("/news/"))) {
      throw new ConvexError(`"${rule.label}" must be a page on this site (${pagesWithParts().join(", ")}) or a full web address.`);
    }
    return link;
  }
  if (rule.kind === "background" && !["default", "white"].includes(value)) {
    throw new ConvexError(`"${rule.label}" must be default or white.`);
  }
  if (rule.kind === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    throw new ConvexError(`"${rule.label}" must look like 2026-11-06.`);
  }
  if (rule.kind === "category" && !CATEGORIES.includes(value)) {
    throw new ConvexError(`"${rule.label}" must be one of: ${CATEGORIES.join(", ")}.`);
  }
  return text(value, rule.label, { required: rule.required, max: rule.max });
}

/** Required text fields a new record must have. */
export function missingForCreate(table: ContentTable, doc: Doc) {
  const rules = TEXT_FIELDS[table];
  const missing = Object.keys(rules).filter((field) => rules[field].required && !doc[field]);
  const imageField = IMAGE_FIELD[table];
  // Team members may have no photo: the board imported from the old site doesn't.
  if (imageField && table !== "teamMembers" && table !== "pageSections" && !doc[imageField]) missing.push(imageField);
  return missing;
}

/** Fields the tables require that the agent doesn't choose. */
export function createDefaults(table: ContentTable, now: number): Doc {
  switch (table) {
    case "gallery":
      return { subtext: "", createdAt: now };
    case "startups":
      return { createdAt: now };
    case "news":
      // Today in India, where the site's readers and admin are.
      return { subtitle: "", publishedDate: new Date(now + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10) };
    case "teamMembers":
      return { bio: "", createdAt: now };
    case "pageSections":
      return { createdAt: now };
    default:
      throw new ConvexError(`New ${table} records can't be created by the AI Assistant.`);
  }
}

export const sameValue = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export type Tables = Record<ContentTable, Doc[]>;

/**
 * The tables with the draft applied. Used by the preview and get_site_content:
 * it reads what the ops say, and doesn't check they still apply (Publish does).
 */
export function applyOps(base: Tables, ops: ContentOp[]): Tables {
  const out = Object.fromEntries(
    Object.entries(base).map(([table, docs]) => [table, docs.map((d) => ({ ...d }))]),
  ) as Tables;
  for (const op of ops) {
    if (op.op === "text") continue;
    const docs = out[op.table];
    if (op.op === "update") {
      const doc = docs.find((d) => d._id === op.id);
      if (doc) doc[op.field] = op.to;
    } else if (op.op === "create") {
      docs.push({ ...op.doc, _id: op.id });
    } else if (op.op === "delete") {
      out[op.table] = docs.filter((d) => d._id !== op.id);
    } else if (op.op === "reorder") {
      applyReorder(docs, op.ids, op.table);
    }
  }
  return out;
}

/**
 * Gives the listed records the same `createdAt` values they already hold, in the
 * order asked for. Lists show newest first; added sections show oldest first, so a
 * new one lands below the others.
 */
export function applyReorder(docs: Doc[], ids: string[], table?: ContentTable) {
  const moving = ids.map((id) => docs.find((d) => d._id === id)).filter((d): d is Doc => !!d);
  const direction = table === "pageSections" ? 1 : -1;
  const slots = moving.map((d) => d.createdAt as number).sort((x, y) => (x - y) * direction);
  moving.forEach((d, i) => {
    d.createdAt = slots[i];
  });
  return moving.map((d) => ({ id: d._id as string, createdAt: d.createdAt as number }));
}

/** Published website text with the draft applied, as { key: value }. */
export function applyTextOps(rows: { key: string; value: string }[], ops: ContentOp[]) {
  const values: Record<string, string> = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  for (const op of ops) {
    if (op.op !== "text") continue;
    if (op.to === null) delete values[op.key];
    else values[op.key] = op.to;
  }
  return values;
}

/** One line for the admin and the review agent. */
export function describeOp(op: ContentOp) {
  switch (op.op) {
    case "update":
      return `${op.table} ${op.id}: ${op.field} from ${JSON.stringify(op.from)} to ${JSON.stringify(op.to)}`;
    case "create":
      return `${op.table}: new record ${JSON.stringify(op.doc)}`;
    case "delete":
      return `${op.table}: delete ${op.id} (${op.label})`;
    case "reorder":
      return `${op.table}: reorder to ${op.ids.join(", ")}`;
    case "text":
      return `website text ${op.key}: from ${op.from === null ? "the text written in the website's code" : JSON.stringify(op.from)} to ${op.to === null ? "the text written in the website's code" : JSON.stringify(op.to)}`;
  }
}
