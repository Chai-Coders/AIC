import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/access";
import { ENTITIES, sameValue, type Entity, type FieldDef } from "./lib/registry";
import {
  applyTarget,
  closeSittings,
  getRecord,
  getSettings,
  lastEditAt,
  lastRecordEditAt,
  resolveRecordId,
  startAppliedVersion,
  type ApplyResult,
} from "./lib/history";
import { imageUrl } from "./images";

// The Versions page: the history of every change to the website, with undo.
// History is one line, like git without branches. Undo and restore never
// rewrite it; they add a new version on top, which can itself be undone.

const MINUTE = 60 * 1000;
const APPLIED = new Set<Doc<"versions">["status"]>(["open", "closed", "approved"]);

export const isApplied = (version: Doc<"versions">) => APPLIED.has(version.status);

// --- Showing values ----------------------------------------------------------

/** What the CMS shows for a stored value: text, or a picture address. */
export async function displayValue(ctx: QueryCtx, field: FieldDef, value: unknown): Promise<string | null> {
  if (value === null || value === undefined || value === "") return null;
  if (field.kind === "image") {
    const raw = String(value);
    if (raw.startsWith("pending:")) {
      const id = ctx.db.normalizeId("pendingImages", raw.slice("pending:".length));
      const pending = id && (await ctx.db.get(id));
      return pending ? await ctx.storage.getUrl(pending.storageId) : null;
    }
    const url = imageUrl(raw as Id<"images">);
    return url && `${url}?w=480`;
  }
  if (field.kind === "select") return field.options?.find((o) => o.value === value)?.label ?? String(value);
  return String(value);
}

async function displayRecord(ctx: QueryCtx, entity: Entity, before: unknown, after: unknown) {
  const b = (before ?? {}) as Record<string, unknown>;
  const a = (after ?? {}) as Record<string, unknown>;
  return await Promise.all(
    ENTITIES[entity].fields.map(async (f) => ({
      key: f.key,
      label: f.label,
      kind: f.kind,
      before: before ? await displayValue(ctx, f, b[f.key]) : null,
      after: after ? await displayValue(ctx, f, a[f.key]) : null,
    })),
  );
}

/** One change as the Versions page shows it. */
export async function describeChange(ctx: QueryCtx, change: Doc<"changes">, version: Doc<"versions">) {
  const def = ENTITIES[change.entity];
  const recordId = await resolveRecordId(ctx, change.entity, change.recordId);
  const doc = (await getRecord(ctx, change.entity, recordId)) as Record<string, unknown> | null;
  const snapshot = (change.after ?? change.before ?? {}) as Record<string, unknown>;
  const itemTitle = def.title(doc ?? snapshot);
  const applied = isApplied(version) && !change.skipped && !change.overridden;
  const base = {
    id: change._id,
    entity: change.entity,
    page: def.page,
    noun: def.noun,
    recordId,
    itemTitle,
    recordExists: !!doc,
    op: change.op,
    editedAt: change.editedAt,
    skipped: !!change.skipped,
    overridden: !!change.overridden,
    force: !!change.force,
  };

  if (change.field === "") {
    const lastAt = doc ? await lastRecordEditAt(ctx, change.entity, recordId) : undefined;
    // Undoing an add deletes the record; undoing a delete puts it back.
    const canUndo = applied && (change.op === "create" ? !!doc : !doc);
    return {
      ...base,
      field: "",
      fieldLabel: change.op === "create" ? `New ${def.noun}` : `Deleted ${def.noun}`,
      kind: "record" as const,
      options: null,
      fields: await displayRecord(ctx, change.entity, change.before, change.after),
      before: null,
      after: null,
      current: null,
      rawAfter: change.after,
      laterEditAt: lastAt !== undefined && lastAt > change.editedAt ? lastAt : undefined,
      canUndo,
    };
  }

  const field = def.fields.find((f) => f.key === change.field)!;
  const currentRaw = doc ? (doc[change.field] ?? null) : null;
  // A record that was deleted and put back counts as changed in every field.
  const lastAt = doc
    ? Math.max(
        (await lastEditAt(ctx, change.entity, recordId, change.field)) ?? 0,
        (await lastEditAt(ctx, change.entity, recordId, "")) ?? 0,
      ) || undefined
    : undefined;
  return {
    ...base,
    field: change.field,
    fieldLabel: field.label,
    kind: field.kind,
    options: field.options ?? null,
    fields: null,
    before: await displayValue(ctx, field, change.before),
    after: await displayValue(ctx, field, change.after),
    current: doc ? await displayValue(ctx, field, currentRaw) : null,
    rawAfter: change.after,
    laterEditAt: lastAt !== undefined && lastAt > change.editedAt ? lastAt : undefined,
    canUndo: applied && !!doc && !sameValue(currentRaw, change.before),
  };
}

// --- Listing -----------------------------------------------------------------

const historyFilter = v.union(
  v.literal("all"),
  v.literal("cms"),
  v.literal("mcp"),
  v.literal("rollback"),
  v.literal("rejected"),
);

async function summarize(ctx: QueryCtx, version: Doc<"versions">, sittingMinutes: number) {
  const changes = await ctx.db
    .query("changes")
    .withIndex("by_version", (q) => q.eq("versionId", version._id))
    .collect();
  const items = new Map<string, { entity: Entity; page: string; title: string; op: string; fields: string[] }>();
  for (const change of changes) {
    const key = `${change.entity}:${change.recordId}`;
    let item = items.get(key);
    if (!item) {
      const def = ENTITIES[change.entity];
      const recordId = await resolveRecordId(ctx, change.entity, change.recordId);
      const doc = await getRecord(ctx, change.entity, recordId);
      const snapshot = (change.after ?? change.before ?? {}) as Record<string, unknown>;
      item = { entity: change.entity, page: def.page, title: def.title((doc as never) ?? snapshot), op: change.op, fields: [] };
      items.set(key, item);
    }
    if (change.field) {
      item.fields.push(ENTITIES[change.entity].fields.find((f) => f.key === change.field)?.label ?? change.field);
    } else {
      item.op = change.op;
    }
  }
  // Later versions that undid this one, or restored the website to it.
  const pointedAtBy = await ctx.db
    .query("versions")
    .withIndex("by_reverts", (q) => q.eq("revertsVersionId", version._id))
    .collect();
  const undoneBy = pointedAtBy.filter((u) => u.rollbackKind !== "restore");
  const restoredBy = pointedAtBy.filter((u) => u.rollbackKind === "restore");
  const reverts = version.revertsVersionId ? await ctx.db.get(version.revertsVersionId) : null;
  return {
    id: version._id,
    source: version.source,
    status: version.status,
    rollbackKind: version.rollbackKind ?? null,
    app: version.app ?? null,
    note: version.note ?? null,
    changeCount: version.changeCount,
    createdAt: version.createdAt,
    lastEditAt: version.lastEditAt,
    decidedAt: version.decidedAt ?? null,
    editingNow: version.status === "open" && Date.now() - version.lastEditAt < sittingMinutes * MINUTE,
    pages: [...new Set([...items.values()].map((i) => i.page))],
    items: [...items.values()],
    overriddenCount: changes.filter((c) => c.overridden).length,
    reverts: reverts ? { id: reverts._id, createdAt: reverts.createdAt, source: reverts.source } : null,
    undoneBy: undoneBy.map((u) => ({ id: u._id, createdAt: u.createdAt, kind: u.rollbackKind ?? null })),
    restoredBy: restoredBy.map((u) => ({ id: u._id, createdAt: u.createdAt })),
  };
}

/** History, newest first. The pending AI draft is shown on its own tab. */
export const list = query({
  args: { paginationOpts: paginationOptsValidator, filter: v.optional(historyFilter) },
  handler: async (ctx, { paginationOpts, filter = "all" }) => {
    await requireAdmin(ctx);
    const { sittingMinutes } = await getSettings(ctx);
    const page = await ctx.db
      .query("versions")
      .withIndex("by_createdAt")
      .order("desc")
      .filter((q) => {
        const notPending = q.neq(q.field("status"), "pending");
        const notEmpty = q.or(q.gt(q.field("changeCount"), 0), q.eq(q.field("status"), "rejected"));
        const base = q.and(notPending, notEmpty);
        if (filter === "rejected") return q.and(base, q.eq(q.field("status"), "rejected"));
        if (filter === "all") return base;
        return q.and(base, q.eq(q.field("source"), filter));
      })
      .paginate(paginationOpts);
    return { ...page, page: await Promise.all(page.page.map((x) => summarize(ctx, x, sittingMinutes))) };
  },
});

/** One version with every change, before and after. */
export const get = query({
  args: { versionId: v.string() },
  handler: async (ctx, { versionId }) => {
    await requireAdmin(ctx);
    const id = ctx.db.normalizeId("versions", versionId);
    const version = id && (await ctx.db.get(id));
    if (!version) return null;
    const { sittingMinutes } = await getSettings(ctx);
    const changes = await ctx.db
      .query("changes")
      .withIndex("by_version", (q) => q.eq("versionId", version._id))
      .collect();
    changes.sort((a, b) => a.editedAt - b.editedAt);
    // The neighbours in the one-line history, for "older / newer" links.
    const [newer, older] = await Promise.all([
      ctx.db
        .query("versions")
        .withIndex("by_createdAt", (q) => q.gt("createdAt", version.createdAt))
        .filter((q) => q.and(q.neq(q.field("status"), "pending"), q.gt(q.field("changeCount"), 0)))
        .first(),
      ctx.db
        .query("versions")
        .withIndex("by_createdAt", (q) => q.lt("createdAt", version.createdAt))
        .order("desc")
        .filter((q) => q.and(q.neq(q.field("status"), "pending"), q.gt(q.field("changeCount"), 0)))
        .first(),
    ]);
    return {
      ...(await summarize(ctx, version, sittingMinutes)),
      applied: isApplied(version),
      newerId: newer?._id ?? null,
      olderId: older?._id ?? null,
      changes: await Promise.all(changes.map((c) => describeChange(ctx, c, version))),
    };
  },
});

// --- Restoring to a point ----------------------------------------------------

type PlanItem = {
  key: string;
  entity: Entity;
  recordId: string;
  field: string;
  kind: "update" | "delete" | "recreate";
  target: unknown;
  aliasFrom?: string;
};

/**
 * What it takes to make the website look as it did right after `point`: for
 * every field changed since, its value before the first of those changes.
 */
async function restorePlan(ctx: QueryCtx, point: Doc<"versions">) {
  const later = await ctx.db
    .query("versions")
    .withIndex("by_createdAt", (q) => q.gt("createdAt", point.createdAt))
    .collect();
  const fieldTargets = new Map<string, unknown>(); // "entity:record:field" -> value
  const records = new Map<string, { entity: Entity; recordId: string; existed: boolean; snapshot?: Record<string, unknown> }>();

  for (const version of later) {
    if (!isApplied(version)) continue;
    const changes = await ctx.db
      .query("changes")
      .withIndex("by_version", (q) => q.eq("versionId", version._id))
      .collect();
    changes.sort((a, b) => a.editedAt - b.editedAt);
    for (const change of changes) {
      if (change.skipped || change.overridden) continue;
      const recordId = await resolveRecordId(ctx, change.entity, change.recordId);
      const recordKey = `${change.entity}:${recordId}`;
      const state = records.get(recordKey);
      if (change.field === "") {
        if (!state) {
          records.set(recordKey, {
            entity: change.entity,
            recordId,
            existed: change.op === "delete",
            snapshot: change.op === "delete" ? (change.before as Record<string, unknown>) : undefined,
          });
        } else if (change.op === "delete" && state.existed && !state.snapshot) {
          state.snapshot = change.before as Record<string, unknown>;
        }
      } else {
        if (!state) records.set(recordKey, { entity: change.entity, recordId, existed: true });
        const key = `${recordKey}:${change.field}`;
        if (!fieldTargets.has(key)) fieldTargets.set(key, change.before ?? null);
      }
    }
  }

  const items: PlanItem[] = [];
  for (const [recordKey, state] of records) {
    const doc = (await getRecord(ctx, state.entity, state.recordId)) as Record<string, unknown> | null;
    if (!state.existed) {
      if (doc) items.push({ key: `${recordKey}:`, entity: state.entity, recordId: state.recordId, field: "", kind: "delete", target: null });
      continue;
    }
    if (!doc) {
      if (!state.snapshot) continue;
      const target = { ...state.snapshot };
      for (const f of ENTITIES[state.entity].fields) {
        const key = `${recordKey}:${f.key}`;
        if (fieldTargets.has(key)) target[f.key] = fieldTargets.get(key);
      }
      items.push({
        key: `${recordKey}:`,
        entity: state.entity,
        recordId: state.recordId,
        field: "",
        kind: "recreate",
        target,
        aliasFrom: state.recordId,
      });
      continue;
    }
    for (const f of ENTITIES[state.entity].fields) {
      const key = `${recordKey}:${f.key}`;
      if (!fieldTargets.has(key)) continue;
      const target = fieldTargets.get(key);
      if (sameValue(doc[f.key], target)) continue;
      items.push({ key, entity: state.entity, recordId: state.recordId, field: f.key, kind: "update", target });
    }
  }
  return items;
}

async function loadVersion(ctx: QueryCtx, versionId: Id<"versions">) {
  const version = await ctx.db.get(versionId);
  if (!version) throw new ConvexError("That version no longer exists.");
  return version;
}

/** Every field that "Restore website to this point" would change. */
export const restorePreview = query({
  args: { versionId: v.id("versions") },
  handler: async (ctx, { versionId }) => {
    await requireAdmin(ctx);
    const version = await loadVersion(ctx, versionId);
    if (!isApplied(version)) return [];
    const plan = await restorePlan(ctx, version);
    return await Promise.all(
      plan.map(async (item) => {
        const def = ENTITIES[item.entity];
        const doc = (await getRecord(ctx, item.entity, item.recordId)) as Record<string, unknown> | null;
        const title = def.title(doc ?? (item.target as Record<string, unknown>) ?? {});
        if (item.field === "") {
          return {
            key: item.key,
            entity: item.entity,
            page: def.page,
            noun: def.noun,
            itemTitle: title,
            kind: item.kind,
            fieldLabel: item.kind === "delete" ? `Remove ${def.noun}` : `Put back deleted ${def.noun}`,
            fieldKind: "record",
            fields: await displayRecord(ctx, item.entity, doc ? doc : null, item.kind === "recreate" ? item.target : null),
            current: null,
            target: null,
          };
        }
        const field = def.fields.find((f) => f.key === item.field)!;
        return {
          key: item.key,
          entity: item.entity,
          page: def.page,
          noun: def.noun,
          itemTitle: title,
          kind: item.kind,
          fieldLabel: field.label,
          fieldKind: field.kind,
          fields: null,
          current: await displayValue(ctx, field, doc?.[item.field]),
          target: await displayValue(ctx, field, item.target),
        };
      }),
    );
  },
});

// --- Undo --------------------------------------------------------------------

// Put records back first, then fields, then remove records, so fields of a
// record that is being put back have somewhere to go.
const ORDER = { recreate: 0, update: 1, delete: 2 };

async function applyPlan(ctx: MutationCtx, versionId: Id<"versions">, plan: PlanItem[]) {
  plan.sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
  const results: ApplyResult[] = [];
  for (const item of plan) {
    const recordId = item.kind === "update" ? await resolveRecordId(ctx, item.entity, item.recordId) : item.recordId;
    results.push(await applyTarget(ctx, versionId, item.entity, recordId, item.field, item.target, { aliasFrom: item.aliasFrom }));
  }
  const version = await ctx.db.get(versionId);
  if (version && version.changeCount === 0) {
    await ctx.db.delete(versionId);
    return { applied: 0, skipped: results.map((r) => r.reason).filter(Boolean), versionId: null };
  }
  return {
    applied: results.filter((r) => r.applied).length,
    skipped: results.map((r) => r.reason).filter(Boolean) as string[],
    versionId,
  };
}

/** The undo of one change: put back its value from before. */
async function undoItem(ctx: QueryCtx, change: Doc<"changes">): Promise<PlanItem> {
  const recordId = await resolveRecordId(ctx, change.entity, change.recordId);
  const key = `${change.entity}:${recordId}:${change.field}`;
  if (change.field !== "") {
    return { key, entity: change.entity, recordId, field: change.field, kind: "update", target: change.before ?? null };
  }
  if (change.op === "create") return { key, entity: change.entity, recordId, field: "", kind: "delete", target: null };
  return { key, entity: change.entity, recordId, field: "", kind: "recreate", target: change.before, aliasFrom: recordId };
}

/** "Undo these changes": puts back the before-values of the chosen changes. */
export const undoVersion = mutation({
  args: { versionId: v.id("versions"), changeIds: v.array(v.id("changes")) },
  handler: async (ctx, { versionId, changeIds }) => {
    await requireAdmin(ctx);
    const version = await loadVersion(ctx, versionId);
    if (!isApplied(version)) throw new ConvexError("This version was never applied to the website.");
    if (changeIds.length === 0) throw new ConvexError("Choose at least one change to undo.");
    const plan: PlanItem[] = [];
    for (const id of changeIds) {
      const change = await ctx.db.get(id);
      if (!change || change.versionId !== versionId) throw new ConvexError("That change is not part of this version.");
      if (change.skipped || change.overridden) continue;
      plan.push(await undoItem(ctx, change));
    }
    const rollbackId = await startAppliedVersion(ctx, {
      source: "rollback",
      status: "closed",
      rollbackKind: "undo",
      revertsVersionId: versionId,
    });
    return await applyPlan(ctx, rollbackId, plan);
  },
});

/** "Put back": undoes a single change. */
export const revertChange = mutation({
  args: { changeId: v.id("changes") },
  handler: async (ctx, { changeId }) => {
    await requireAdmin(ctx);
    const change = await ctx.db.get(changeId);
    if (!change) throw new ConvexError("That change no longer exists.");
    const version = await loadVersion(ctx, change.versionId);
    if (!isApplied(version) || change.skipped || change.overridden) {
      throw new ConvexError("This change was never applied to the website.");
    }
    const rollbackId = await startAppliedVersion(ctx, {
      source: "rollback",
      status: "closed",
      rollbackKind: "revert",
      revertsVersionId: version._id,
    });
    return await applyPlan(ctx, rollbackId, [await undoItem(ctx, change)]);
  },
});

/** "Restore website to this point": applies the chosen items of restorePreview. */
export const restoreTo = mutation({
  args: { versionId: v.id("versions"), keys: v.array(v.string()) },
  handler: async (ctx, { versionId, keys }) => {
    await requireAdmin(ctx);
    const version = await loadVersion(ctx, versionId);
    if (!isApplied(version)) throw new ConvexError("This version was never applied to the website.");
    const wanted = new Set(keys);
    const plan = (await restorePlan(ctx, version)).filter((item) => wanted.has(item.key));
    if (plan.length === 0) throw new ConvexError("Nothing to restore: the website already matches this version.");
    const rollbackId = await startAppliedVersion(ctx, {
      source: "rollback",
      status: "closed",
      rollbackKind: "restore",
      revertsVersionId: versionId,
    });
    return await applyPlan(ctx, rollbackId, plan);
  },
});

// --- Sittings and settings ---------------------------------------------------

/** Ends the current CMS sitting (called on sign-out). */
export const closeSitting = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    await closeSittings(ctx);
  },
});

export const settings = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await getSettings(ctx);
  },
});

export const saveSettings = mutation({
  args: { sittingMinutes: v.number() },
  handler: async (ctx, { sittingMinutes }) => {
    await requireAdmin(ctx);
    if (!Number.isInteger(sittingMinutes) || sittingMinutes < 1 || sittingMinutes > 24 * 60) {
      throw new ConvexError("Choose between 1 minute and 24 hours.");
    }
    const row = await ctx.db.query("settings").first();
    if (row) await ctx.db.patch(row._id, { sittingMinutes });
    else await ctx.db.insert("settings", { sittingMinutes });
  },
});
