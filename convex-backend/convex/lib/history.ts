import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { ENTITIES, fullSnapshot, sameValue, type Entity } from "./registry";
import { allTextDocs, textDoc, writeText } from "./siteText";

// Writing to the version history. Every live change to a tracked record goes
// through here, whether it came from a CMS form, an undo or an approved AI
// draft, so the history stays complete and in one line.

export const DEFAULT_SITTING_MINUTES = 30;
const MINUTE = 60 * 1000;

export async function getSettings(ctx: QueryCtx) {
  const row = await ctx.db.query("settings").first();
  return { sittingMinutes: row?.sittingMinutes ?? DEFAULT_SITTING_MINUTES };
}

/** Follows ids of deleted records that were put back (see recordAliases). */
export async function resolveRecordId(ctx: QueryCtx, entity: Entity, recordId: string) {
  let current = recordId;
  for (let hops = 0; hops < 50; hops++) {
    const alias = await ctx.db
      .query("recordAliases")
      .withIndex("by_from", (q) => q.eq("entity", entity).eq("fromId", current))
      .first();
    if (!alias) break;
    current = alias.toId;
  }
  return current;
}

export async function getRecord(ctx: QueryCtx, entity: Entity, recordId: string) {
  if (entity === "siteText") return (await textDoc(ctx, recordId)) as unknown as Doc<Entity> | null;
  const id = ctx.db.normalizeId(entity, recordId);
  return id ? ((await ctx.db.get(id)) as Doc<Entity> | null) : null;
}

/** Every live record of a kind (website texts included). */
export async function listRecords(ctx: QueryCtx, entity: Entity) {
  if (entity === "siteText") return (await allTextDocs(ctx)) as unknown as Doc<Entity>[];
  return (await ctx.db.query(entity).collect()) as Doc<Entity>[];
}

/** When a field (or, with field "", the record itself) last changed live. */
export async function lastEditAt(ctx: QueryCtx, entity: Entity, recordId: string, field: string) {
  const row = await ctx.db
    .query("fieldEdits")
    .withIndex("by_field", (q) => q.eq("entity", entity).eq("recordId", recordId).eq("field", field))
    .first();
  return row?.lastEditedAt;
}

/** The latest live change to any field of a record, or the record itself. */
export async function lastRecordEditAt(ctx: QueryCtx, entity: Entity, recordId: string) {
  const rows = await ctx.db
    .query("fieldEdits")
    .withIndex("by_field", (q) => q.eq("entity", entity).eq("recordId", recordId))
    .collect();
  return rows.reduce<number | undefined>((max, r) => (max === undefined || r.lastEditedAt > max ? r.lastEditedAt : max), undefined);
}

async function touch(ctx: MutationCtx, entity: Entity, recordId: string, field: string, at: number) {
  const row = await ctx.db
    .query("fieldEdits")
    .withIndex("by_field", (q) => q.eq("entity", entity).eq("recordId", recordId).eq("field", field))
    .first();
  if (!row) await ctx.db.insert("fieldEdits", { entity, recordId, field, lastEditedAt: at });
  else if (at > row.lastEditedAt) await ctx.db.patch(row._id, { lastEditedAt: at });
}

type NewChange = {
  entity: Entity;
  recordId: string;
  field: string;
  op: "create" | "update" | "delete";
  before: unknown;
  after: unknown;
  editedAt: number;
};

/**
 * Adds a change to a version that is still being written (a CMS sitting or
 * the AI draft). A second change to the same field is merged into the first,
 * so each field shows once: its value before the version and its latest value.
 * Returns the id of the change that now holds it, if any.
 */
export async function addChange(ctx: MutationCtx, versionId: Id<"versions">, change: NewChange) {
  const existing = await ctx.db
    .query("changes")
    .withIndex("by_version_record", (q) =>
      q.eq("versionId", versionId).eq("entity", change.entity).eq("recordId", change.recordId),
    )
    .collect();
  const created = existing.find((c) => c.op === "create");
  let delta = 0;
  let result: Id<"changes"> | null = null;

  if (change.op === "update") {
    if (created) {
      // Still a new record in this version: fold the edit into it.
      await ctx.db.patch(created._id, {
        after: { ...(created.after as object), [change.field]: change.after },
        editedAt: change.editedAt,
      });
      result = created._id;
    } else {
      const same = existing.find((c) => c.op === "update" && c.field === change.field);
      if (same && sameValue(same.before, change.after)) {
        await ctx.db.delete(same._id);
        delta = -1;
      } else if (same) {
        await ctx.db.patch(same._id, { after: change.after, editedAt: change.editedAt, force: undefined });
        result = same._id;
      } else if (!sameValue(change.before, change.after)) {
        result = await ctx.db.insert("changes", { versionId, ...change });
        delta = 1;
      }
    }
  } else if (change.op === "create") {
    result = await ctx.db.insert("changes", { versionId, ...change });
    delta = 1;
  } else if (created) {
    // Added and deleted within the same version: nothing is left to show.
    for (const c of existing) await ctx.db.delete(c._id);
    delta = -existing.length;
  } else {
    // Record the record as it was before this version, not after its edits.
    const before = { ...(change.before as Record<string, unknown>) };
    const updates = existing.filter((c) => c.op === "update");
    for (const c of updates) {
      before[c.field] = c.before;
      await ctx.db.delete(c._id);
    }
    result = await ctx.db.insert("changes", { versionId, ...change, before });
    delta = 1 - updates.length;
  }

  const version = await ctx.db.get(versionId);
  if (version) {
    await ctx.db.patch(versionId, { changeCount: version.changeCount + delta, lastEditAt: Date.now() });
  }
  return result;
}

/** Ends the open CMS sitting, if any. Empty sittings are removed. */
export async function closeSittings(ctx: MutationCtx) {
  const open = await ctx.db
    .query("versions")
    .withIndex("by_status", (q) => q.eq("status", "open"))
    .collect();
  for (const version of open) await closeVersion(ctx, version);
}

async function closeVersion(ctx: MutationCtx, version: Doc<"versions">) {
  if (version.changeCount <= 0) await ctx.db.delete(version._id);
  else await ctx.db.patch(version._id, { status: "closed" });
}

/** The CMS sitting to add an edit to: the open one, or a new one after a pause. */
export async function cmsSitting(ctx: MutationCtx) {
  const now = Date.now();
  const { sittingMinutes } = await getSettings(ctx);
  const open = await ctx.db
    .query("versions")
    .withIndex("by_status", (q) => q.eq("status", "open"))
    .collect();
  let current: Doc<"versions"> | undefined;
  for (const version of open) {
    if (!current && version.source === "cms" && now - version.lastEditAt < sittingMinutes * MINUTE) current = version;
    else await closeVersion(ctx, version);
  }
  if (current) return current._id;
  return await ctx.db.insert("versions", {
    source: "cms",
    status: "open",
    changeCount: 0,
    createdAt: now,
    lastEditAt: now,
  });
}

/**
 * Records a CMS edit that has just been saved. Pass the record as it was
 * (null when it was just added) and as it is now (null when just deleted).
 */
export async function recordCmsEdit(
  ctx: MutationCtx,
  entity: Entity,
  recordId: string,
  before: Doc<Entity> | null,
  after: Doc<Entity> | null,
) {
  const now = Date.now();
  const versionId = await cmsSitting(ctx);
  if (!before && after) {
    await addChange(ctx, versionId, { entity, recordId, field: "", op: "create", before: null, after: fullSnapshot(after), editedAt: now });
    await touch(ctx, entity, recordId, "", now);
  } else if (before && !after) {
    await addChange(ctx, versionId, { entity, recordId, field: "", op: "delete", before: fullSnapshot(before), after: null, editedAt: now });
    await touch(ctx, entity, recordId, "", now);
  } else if (before && after) {
    const b = before as Record<string, unknown>;
    const a = after as Record<string, unknown>;
    for (const { key } of ENTITIES[entity].fields) {
      if (sameValue(b[key], a[key])) continue;
      await addChange(ctx, versionId, {
        entity,
        recordId,
        field: key,
        op: "update",
        before: b[key] ?? null,
        after: a[key] ?? null,
        editedAt: now,
      });
      await touch(ctx, entity, recordId, key, now);
    }
  }
}

/** Starts a version that is applied right away (an undo, or an approved draft). */
export async function startAppliedVersion(
  ctx: MutationCtx,
  fields: Pick<Doc<"versions">, "source" | "status"> & Partial<Doc<"versions">>,
) {
  // Keep history in one line: a sitting that was open before this version
  // must not collect edits made after it.
  await closeSittings(ctx);
  const now = Date.now();
  return await ctx.db.insert("versions", { changeCount: 0, createdAt: now, lastEditAt: now, ...fields });
}

/** Drops nulls (empty values) so a record can be written to its table. */
function withoutNulls(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== null && value !== undefined));
}

export type ApplyResult = { applied: boolean; reason?: string; recordId: string };

/**
 * Sets one field, or adds / deletes a whole record (field ""; `target` is
 * the record, or null to delete it), and records it in `versionId`.
 * `editedAt` is when the change was made (now, unless it is an AI proposal).
 */
export async function applyTarget(
  ctx: MutationCtx,
  versionId: Id<"versions">,
  entity: Entity,
  recordId: string,
  field: string,
  target: unknown,
  { editedAt = Date.now(), aliasFrom }: { editedAt?: number; aliasFrom?: string } = {},
): Promise<ApplyResult> {
  const doc = await getRecord(ctx, entity, recordId);
  const noun = ENTITIES[entity].noun;

  if (field === "" && ENTITIES[entity].fixed) {
    throw new ConvexError(`A ${noun} can only be changed, not added or deleted.`);
  }
  if (field === "") {
    if (target === null) {
      if (!doc) return { applied: false, reason: `The ${noun} was already deleted.`, recordId };
      await ctx.db.delete(doc._id);
      await addChange(ctx, versionId, { entity, recordId, field: "", op: "delete", before: fullSnapshot(doc), after: null, editedAt });
      await touch(ctx, entity, recordId, "", editedAt);
      return { applied: true, recordId };
    }
    if (doc) return { applied: false, reason: `The ${noun} is already on the website.`, recordId };
    const data = withoutNulls(target as Record<string, unknown>);
    let newId: string;
    try {
      // The table's schema checks the record is complete.
      newId = await ctx.db.insert(entity, data as never);
    } catch {
      throw new ConvexError(`The ${noun} could not be added: something it needs is missing.`);
    }
    if (aliasFrom) await ctx.db.insert("recordAliases", { entity, fromId: aliasFrom, toId: newId });
    const created = (await ctx.db.get(newId as Id<Entity>)) as Doc<Entity>;
    await addChange(ctx, versionId, { entity, recordId: newId, field: "", op: "create", before: null, after: fullSnapshot(created), editedAt });
    await touch(ctx, entity, newId, "", editedAt);
    return { applied: true, recordId: newId };
  }

  if (!doc) return { applied: false, reason: `The ${noun} has since been deleted.`, recordId };
  const current = (doc as Record<string, unknown>)[field] ?? null;
  if (sameValue(current, target)) return { applied: false, reason: "It already has this value.", recordId };
  if (entity === "siteText") await writeText(ctx, recordId, target);
  else await ctx.db.patch(doc._id, { [field]: target ?? undefined } as never);
  await addChange(ctx, versionId, { entity, recordId, field, op: "update", before: current, after: target ?? null, editedAt });
  await touch(ctx, entity, recordId, field, editedAt);
  return { applied: true, recordId };
}
