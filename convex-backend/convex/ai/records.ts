// The content path's rules: which record fields the agent may change, how
// typed operations are applied to records, and how to compare them. The fields
// and their checks are the version history's (lib/registry.ts), so the AI
// Assistant follows the same rules as the CMS forms and AI apps (MCP). Pure
// functions, used by the draft tools, the preview and sending to the AI draft.
import { ConvexError } from "convex/values";
import { ENTITIES, normalizeValue } from "../lib/registry";
import type { ContentOp, ContentTable } from "../schema";

type Doc = Record<string, any>;

const textDefs = (table: ContentTable) => ENTITIES[table].fields.filter((f) => f.kind !== "image");

export const imageFieldOf = (table: ContentTable) => ENTITIES[table].fields.find((f) => f.kind === "image")?.key;
export const textFieldsOf = (table: ContentTable) => textDefs(table).map((f) => f.key);

/** The value to store for a text field, or throws a message for the model. */
export function checkTextField(table: ContentTable, field: string, value: unknown) {
  const def = textDefs(table).find((f) => f.key === field);
  if (!def) {
    throw new ConvexError(`"${field}" can't be edited on ${table}. Editable fields: ${textFieldsOf(table).join(", ")}.`);
  }
  if (typeof value !== "string") throw new ConvexError(`"${def.label}" must be text.`);
  return normalizeValue(def, value);
}

/** Required fields a new record must have, its picture included. */
export function missingForCreate(table: ContentTable, doc: Doc) {
  return ENTITIES[table].fields.filter((f) => f.required && !doc[f.key]).map((f) => f.key);
}

/** Fields the tables require that the agent doesn't choose. Only the preview uses the dates. */
export function createDefaults(table: ContentTable, now: number): Doc {
  switch (table) {
    case "gallery":
      return { subtext: "", createdAt: now };
    case "startups":
      return { createdAt: now };
    case "news":
      // Approving sets the real date. Today in India, where the site's readers and admin are.
      return { subtitle: "", publishedDate: new Date(now + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10) };
    case "teamMembers":
      return { bio: "", createdAt: now };
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
    }
  }
  return out;
}

/** Edited website text ({ key: value }) with the draft applied. */
export function applyTextOps(base: Record<string, string>, ops: ContentOp[]) {
  const values = { ...base };
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
    case "text":
      return `website text ${op.key}: from ${op.from === null ? "the text written in the website's code" : JSON.stringify(op.from)} to ${op.to === null ? "the text written in the website's code" : JSON.stringify(op.to)}`;
  }
}
