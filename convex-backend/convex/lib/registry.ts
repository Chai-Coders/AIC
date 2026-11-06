import { ConvexError, v, type Infer } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { optionalUrl, text } from "./validate";

// Every editable field on the website, with the label the CMS shows for it.
// Version history, the Versions page and the MCP tools all read this, so a
// field added here is tracked, diffed and editable by the AI.

export const entity = v.union(
  v.literal("gallery"),
  v.literal("startups"),
  v.literal("news"),
  v.literal("teamMembers"),
);
export type Entity = Infer<typeof entity>;

export type FieldKind = "text" | "textarea" | "url" | "select" | "image";

export type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  max?: number;
  options?: { value: string; label: string }[];
};

export type EntityDef = {
  entity: Entity;
  /** Name used by the MCP tools and in field keys, e.g. "team/<id>/role". */
  type: string;
  page: string;
  noun: string;
  fields: FieldDef[];
  title: (doc: Record<string, unknown>) => string;
};

export const TEAM_CATEGORY_OPTIONS = [
  { value: "team", label: "AIC Team" },
  { value: "governor", label: "Board of Governors" },
  { value: "mentor_intl_industry", label: "International Mentors - Industry" },
  { value: "mentor_intl_academic", label: "International Mentors - Academic" },
  { value: "mentor_india_industry", label: "India Mentors - Industry" },
  { value: "mentor_india_academic", label: "India Mentors - Academic" },
];

const str = (value: unknown) => (typeof value === "string" ? value : "");

export const ENTITIES: Record<Entity, EntityDef> = {
  gallery: {
    entity: "gallery",
    type: "gallery",
    page: "Gallery",
    noun: "photo",
    fields: [
      { key: "imageId", label: "Photo", kind: "image", required: true },
      { key: "subtext", label: "Caption", kind: "text", max: 255 },
    ],
    title: (doc) => str(doc.subtext) || "Untitled photo",
  },
  startups: {
    entity: "startups",
    type: "startups",
    page: "Startups",
    noun: "startup",
    fields: [
      { key: "name", label: "Startup name", kind: "text", required: true, max: 200 },
      { key: "description", label: "Description", kind: "textarea", required: true },
      { key: "websiteUrl", label: "Website", kind: "url" },
      { key: "logoId", label: "Logo", kind: "image", required: true },
    ],
    title: (doc) => str(doc.name) || "Unnamed startup",
  },
  news: {
    entity: "news",
    type: "news",
    page: "News",
    noun: "news article",
    fields: [
      { key: "title", label: "Headline", kind: "text", required: true, max: 255 },
      { key: "subtitle", label: "Summary", kind: "text", max: 300 },
      { key: "content", label: "Article", kind: "textarea", required: true },
      { key: "thumbnailId", label: "Cover image", kind: "image", required: true },
    ],
    title: (doc) => str(doc.title) || "Untitled article",
  },
  teamMembers: {
    entity: "teamMembers",
    type: "team",
    page: "Team",
    noun: "team member",
    fields: [
      { key: "name", label: "Full name", kind: "text", required: true, max: 150 },
      { key: "role", label: "Job title", kind: "text", required: true, max: 150 },
      { key: "category", label: "Group", kind: "select", required: true, options: TEAM_CATEGORY_OPTIONS },
      { key: "bio", label: "Short bio", kind: "textarea" },
      { key: "photoId", label: "Photo", kind: "image" },
    ],
    title: (doc) => str(doc.name) || "Unnamed member",
  },
};

export const ENTITY_LIST = Object.values(ENTITIES);

/** Accepts the MCP type name ("team") or the table name ("teamMembers"). */
export function entityByType(type: string): EntityDef {
  const def = ENTITY_LIST.find((d) => d.type === type || d.entity === type);
  if (!def) {
    throw new ConvexError(`Unknown content type "${type}". Use one of: ${ENTITY_LIST.map((d) => d.type).join(", ")}.`);
  }
  return def;
}

export function fieldDef(entityName: Entity, key: string): FieldDef {
  const field = ENTITIES[entityName].fields.find((f) => f.key === key);
  if (!field) {
    const keys = ENTITIES[entityName].fields.map((f) => f.key).join(", ");
    throw new ConvexError(`"${key}" is not a field of ${ENTITIES[entityName].type}. Fields: ${keys}.`);
  }
  return field;
}

/**
 * Checks and tidies one field value with the same rules as the CMS forms.
 * Returns null for an empty optional value. Image values are not checked here
 * (they are picture ids, or "pending:<id>" in a draft).
 */
export function normalizeValue(field: FieldDef, value: unknown): unknown {
  if (field.kind === "image") {
    if (value === null || value === undefined || value === "") {
      if (field.required) throw new ConvexError(`"${field.label}" needs a picture.`);
      return null;
    }
    return value;
  }
  if (value !== null && value !== undefined && typeof value !== "string") {
    throw new ConvexError(`"${field.label}" must be text.`);
  }
  const raw = (value as string | null | undefined) ?? "";
  switch (field.kind) {
    case "url":
      return optionalUrl(raw, field.label) ?? null;
    case "select": {
      const option = field.options?.find((o) => o.value === raw || o.label === raw);
      if (!option) {
        throw new ConvexError(`"${field.label}" must be one of: ${field.options?.map((o) => o.value).join(", ")}.`);
      }
      return option.value;
    }
    default:
      return text(raw, field.label, { required: field.required, max: field.max });
  }
}

/** The tracked fields of a record, with missing values as null. */
export function snapshot(entityName: Entity, doc: Record<string, unknown>) {
  return Object.fromEntries(ENTITIES[entityName].fields.map((f) => [f.key, doc[f.key] ?? null]));
}

/** The whole record minus system fields, kept so a deleted record can be put back. */
export function fullSnapshot(doc: Doc<Entity>): Record<string, unknown> {
  const { _id, _creationTime, ...rest } = doc as Doc<Entity> & Record<string, unknown>;
  return rest;
}

export const sameValue = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
