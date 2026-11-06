import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/access";
import {
  ENTITIES,
  entityByType,
  fieldDef,
  fullSnapshot,
  normalizeValue,
  sameValue,
  snapshot,
  type Entity,
} from "./lib/registry";
import {
  addChange,
  applyTarget,
  closeSittings,
  getRecord,
  lastEditAt,
  lastRecordEditAt,
  resolveRecordId,
} from "./lib/history";
import { todayIso } from "./lib/validate";
import { describeChange, displayValue } from "./versions";

// The AI draft: changes proposed by connected AI apps (see mcp.ts). There is
// at most one, shared by every chat and app. Nothing in it reaches the
// website until the admin approves it on the Versions page; approving applies
// it in this one mutation and appends it to the history as the newest version.

const PENDING_PREFIX = "pending:";

export async function pendingDraft(ctx: QueryCtx) {
  return await ctx.db
    .query("versions")
    .withIndex("by_status", (q) => q.eq("status", "pending"))
    .first();
}

async function openDraft(ctx: MutationCtx, app: string) {
  const draft = await pendingDraft(ctx);
  if (draft) {
    // Several apps can add to the same draft; list each once.
    const apps = (draft.app ?? "").split(", ").filter(Boolean);
    if (!apps.includes(app)) await ctx.db.patch(draft._id, { app: [...apps, app].join(", ") });
    return draft._id;
  }
  const now = Date.now();
  return await ctx.db.insert("versions", {
    source: "mcp",
    status: "pending",
    app,
    changeCount: 0,
    createdAt: now,
    lastEditAt: now,
  });
}

async function draftChanges(ctx: QueryCtx, versionId: Id<"versions">) {
  const changes = await ctx.db
    .query("changes")
    .withIndex("by_version", (q) => q.eq("versionId", versionId))
    .collect();
  return changes.sort((a, b) => a.editedAt - b.editedAt);
}

/** A field key as the AI uses it: "<type>/<id>/<field>", e.g. "team/k57.../role". */
export function parseFieldKey(key: string) {
  const parts = key.split("/");
  if (parts.length !== 3 || parts.some((p) => !p)) {
    throw new ConvexError(`"${key}" is not a field key. Field keys look like "startups/<id>/name"; find them with find_content.`);
  }
  const def = entityByType(parts[0]);
  return { def, recordId: parts[1], field: fieldDef(def.entity, parts[2]) };
}

export const fieldKey = (entity: Entity, recordId: string, field: string) => `${ENTITIES[entity].type}/${recordId}/${field}`;

/** The live record, or the draft's create change for a "new-N" record. */
async function findTarget(ctx: QueryCtx, versionId: Id<"versions"> | null, entity: Entity, recordId: string) {
  if (recordId.startsWith("new-")) {
    if (!versionId) throw new ConvexError(`There is no draft record "${recordId}".`);
    const created = await ctx.db
      .query("changes")
      .withIndex("by_version_record", (q) => q.eq("versionId", versionId).eq("entity", entity).eq("recordId", recordId))
      .filter((q) => q.eq(q.field("op"), "create"))
      .first();
    if (!created) throw new ConvexError(`There is no draft ${ENTITIES[entity].noun} "${recordId}".`);
    return { live: null, created };
  }
  const live = await getRecord(ctx, entity, await resolveRecordId(ctx, entity, recordId));
  if (!live) throw new ConvexError(`No ${ENTITIES[entity].noun} has the id "${recordId}". Use find_content or get_page to find it.`);
  return { live, created: null };
}

// --- Proposing (called by the MCP tools) ---------------------------------------

export const proposeEdit = internalMutation({
  args: { app: v.string(), field: v.string(), value: v.any() },
  handler: async (ctx, { app, field: key, value }) => {
    const { def, recordId, field } = parseFieldKey(key);
    if (field.kind === "image") throw new ConvexError("Pictures are changed with propose_image or request_upload_link.");
    const normalized = normalizeValue(field, value);
    const versionId = await openDraft(ctx, app);
    const { live } = await findTarget(ctx, versionId, def.entity, recordId);
    const id = live?._id ?? recordId;
    const before = live ? ((live as Record<string, unknown>)[field.key] ?? null) : null;
    if (live && sameValue(before, normalized)) {
      // Proposing the live value takes back an earlier proposal, if any.
      await addChange(ctx, versionId, { entity: def.entity, recordId: id, field: field.key, op: "update", before, after: normalized, editedAt: Date.now() });
      return { field: fieldKey(def.entity, id, field.key), status: "This is already the live value; nothing to change." };
    }
    const changeId = await addChange(ctx, versionId, {
      entity: def.entity,
      recordId: id,
      field: field.key,
      op: "update",
      before,
      after: normalized,
      editedAt: Date.now(),
    });
    return { change_id: changeId, field: fieldKey(def.entity, id, field.key), before, after: normalized };
  },
});

export const proposeCreate = internalMutation({
  args: { app: v.string(), type: v.string(), fields: v.record(v.string(), v.any()) },
  handler: async (ctx, { app, type, fields }) => {
    const def = entityByType(type);
    const record: Record<string, unknown> = {};
    for (const field of def.fields) {
      const given = fields[field.key];
      if (field.kind === "image") {
        if (given !== undefined) throw new ConvexError(`Add the ${field.label.toLowerCase()} with propose_image after creating.`);
        record[field.key] = null;
      } else if (field.kind === "select" && given === undefined) {
        record[field.key] = field.options?.[0]?.value ?? null;
      } else {
        record[field.key] = normalizeValue(field, given ?? "");
      }
    }
    const unknown = Object.keys(fields).filter((k) => !def.fields.some((f) => f.key === k));
    if (unknown.length) throw new ConvexError(`Unknown fields for ${def.type}: ${unknown.join(", ")}.`);

    const versionId = await openDraft(ctx, app);
    const existing = await draftChanges(ctx, versionId);
    let n = 1;
    while (existing.some((c) => c.recordId === `new-${n}`)) n++;
    const recordId = `new-${n}`;
    const changeId = await addChange(ctx, versionId, { entity: def.entity, recordId, field: "", op: "create", before: null, after: record, editedAt: Date.now() });
    const missing = def.fields.filter((f) => f.required && record[f.key] === null).map((f) => fieldKey(def.entity, recordId, f.key));
    return { change_id: changeId, id: recordId, type: def.type, still_needed: missing };
  },
});

export const proposeDelete = internalMutation({
  args: { app: v.string(), type: v.string(), id: v.string() },
  handler: async (ctx, { app, type, id }) => {
    const def = entityByType(type);
    const versionId = await openDraft(ctx, app);
    const { live } = await findTarget(ctx, versionId, def.entity, id);
    const changeId = await addChange(ctx, versionId, {
      entity: def.entity,
      recordId: live?._id ?? id,
      field: "",
      op: "delete",
      before: live ? fullSnapshot(live) : null,
      after: null,
      editedAt: Date.now(),
    });
    return { change_id: changeId, deleted: `${def.type}/${live?._id ?? id}`, title: live ? def.title(live as never) : id };
  },
});

/** Attaches a picture (already in storage) to a field of the draft. */
export async function attachPendingImage(
  ctx: MutationCtx,
  { app, target, storageId, sourceUrl }: { app: string; target: string; storageId: Id<"_storage">; sourceUrl?: string },
) {
  const { def, recordId, field } = parseFieldKey(target);
  if (field.kind !== "image") throw new ConvexError(`"${target}" is not a picture field.`);
  const file = await ctx.db.system.get(storageId);
  if (!file?.contentType?.startsWith("image/")) {
    await ctx.storage.delete(storageId);
    throw new ConvexError("That file is not a picture.");
  }
  const versionId = await openDraft(ctx, app);
  const { live } = await findTarget(ctx, versionId, def.entity, recordId);
  const pendingId = await ctx.db.insert("pendingImages", { versionId, storageId, sourceUrl, createdAt: Date.now() });
  const id = live?._id ?? recordId;
  const changeId = await addChange(ctx, versionId, {
    entity: def.entity,
    recordId: id,
    field: field.key,
    op: "update",
    before: live ? ((live as Record<string, unknown>)[field.key] ?? null) : null,
    after: `${PENDING_PREFIX}${pendingId}`,
    editedAt: Date.now(),
  });
  return { change_id: changeId, field: fieldKey(def.entity, id, field.key), status: "Picture added to the draft." };
}

export const proposeImage = internalMutation({
  args: { app: v.string(), target: v.string(), storageId: v.id("_storage"), sourceUrl: v.optional(v.string()) },
  handler: async (ctx, args) => await attachPendingImage(ctx, args),
});

/** The draft as the AI sees it (view_draft). */
export const viewDraft = internalQuery({
  args: {},
  handler: async (ctx) => {
    const draft = await pendingDraft(ctx);
    if (!draft) return { changes: [], note: "The draft is empty." };
    const changes = await draftChanges(ctx, draft._id);
    return {
      apps: draft.app,
      note: "Nothing here is live. The admin approves or rejects the draft on the CMS Versions page.",
      changes: await Promise.all(
        changes.map(async (c) => {
          const def = ENTITIES[c.entity];
          const recordId = c.recordId.startsWith("new-") ? c.recordId : await resolveRecordId(ctx, c.entity, c.recordId);
          const live = c.recordId.startsWith("new-") ? null : ((await getRecord(ctx, c.entity, recordId)) as Record<string, unknown> | null);
          if (c.field === "") {
            return {
              change_id: c._id,
              op: c.op,
              type: def.type,
              id: recordId,
              title: def.title((c.after ?? c.before ?? {}) as never),
              ...(c.op === "create" ? { fields: c.after } : {}),
            };
          }
          return {
            change_id: c._id,
            op: "update",
            field: fieldKey(c.entity, recordId, c.field),
            item: def.title((live ?? {}) as never),
            live_now: live ? (live[c.field] ?? null) : null,
            proposed: typeof c.after === "string" && c.after.startsWith(PENDING_PREFIX) ? "(new picture)" : c.after,
          };
        }),
      ),
    };
  },
});

export const undoChange = internalMutation({
  args: { changeId: v.string() },
  handler: async (ctx, { changeId }) => {
    const draft = await pendingDraft(ctx);
    const id = ctx.db.normalizeId("changes", changeId);
    const change = id && (await ctx.db.get(id));
    if (!draft || !change || change.versionId !== draft._id) {
      throw new ConvexError("That change is not in the pending draft. Use view_draft to see the change ids.");
    }
    await removeDraftChange(ctx, draft, change);
    return { status: "Removed from the draft." };
  },
});

async function removeDraftChange(ctx: MutationCtx, draft: Doc<"versions">, change: Doc<"changes">) {
  await ctx.db.delete(change._id);
  await ctx.db.patch(draft._id, { changeCount: Math.max(0, draft.changeCount - 1), lastEditAt: Date.now() });
}

// --- Reviewing (the Versions page) ---------------------------------------------

/** Number of changes waiting for approval (for the menu badge). */
export const pendingCount = query({
  args: {},
  handler: async (ctx) => {
    if (!(await getAuthUserId(ctx))) return 0;
    return (await pendingDraft(ctx))?.changeCount ?? 0;
  },
});

/** Required fields of a draft record that are still empty, e.g. a new startup's logo. */
function missingFields(change: Doc<"changes">) {
  if (change.op !== "create" || change.skipped) return [];
  const after = (change.after ?? {}) as Record<string, unknown>;
  return ENTITIES[change.entity].fields
    .filter((f) => f.required && (after[f.key] === null || after[f.key] === undefined || after[f.key] === ""))
    .map((f) => ({ key: f.key, label: f.label, kind: f.kind }));
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const draft = await pendingDraft(ctx);
    if (!draft) return null;
    const changes = await draftChanges(ctx, draft._id);
    const described = await Promise.all(
      changes.map(async (c) => {
        const base = await describeChange(ctx, c, draft);
        const isNew = c.recordId.startsWith("new-");
        const editable = c.field !== "" && !(typeof c.after === "string" && c.after.startsWith(PENDING_PREFIX));
        return {
          ...base,
          isNew,
          // A later edit to the field wins unless the admin forces the AI value.
          overriddenNow: !isNew && base.laterEditAt !== undefined,
          missing: missingFields(c),
          editable,
          // For the create form: the raw values, so the admin can edit them.
          rawFields:
            c.op === "create"
              ? ENTITIES[c.entity].fields.map((f) => ({ ...f, value: (c.after as Record<string, unknown>)[f.key] ?? null }))
              : null,
        };
      }),
    );
    const pending = await ctx.db
      .query("pendingImages")
      .withIndex("by_version", (q) => q.eq("versionId", draft._id))
      .collect();
    return {
      id: draft._id,
      app: draft.app ?? null,
      note: draft.note ?? null,
      createdAt: draft.createdAt,
      lastEditAt: draft.lastEditAt,
      changes: described,
      pendingImages: await Promise.all(pending.map(async (p) => ({ id: p._id, url: await ctx.storage.getUrl(p.storageId) }))),
    };
  },
});

async function draftChange(ctx: QueryCtx, changeId: Id<"changes">) {
  const draft = await pendingDraft(ctx);
  const change = await ctx.db.get(changeId);
  if (!draft || !change || change.versionId !== draft._id) {
    throw new ConvexError("This change is no longer waiting for approval.");
  }
  return { draft, change };
}

/** Tick or untick a change before approving. */
export const setIncluded = mutation({
  args: { changeId: v.id("changes"), included: v.boolean() },
  handler: async (ctx, { changeId, included }) => {
    await requireAdmin(ctx);
    await draftChange(ctx, changeId);
    await ctx.db.patch(changeId, { skipped: included ? undefined : true });
  },
});

/** "Use the AI value anyway" for a field edited after the AI proposed it. */
export const setForce = mutation({
  args: { changeId: v.id("changes"), force: v.boolean() },
  handler: async (ctx, { changeId, force }) => {
    await requireAdmin(ctx);
    await draftChange(ctx, changeId);
    await ctx.db.patch(changeId, { force: force || undefined });
  },
});

/**
 * Edits the proposed value before approving. For a new record pass `field`.
 * Picture fields take the id of a picture uploaded from the Versions page.
 */
export const editValue = mutation({
  args: { changeId: v.id("changes"), value: v.any(), field: v.optional(v.string()) },
  handler: async (ctx, { changeId, value, field: key }) => {
    await requireAdmin(ctx);
    const { change } = await draftChange(ctx, changeId);
    const field = fieldDef(change.entity, key ?? change.field);
    let normalized = normalizeValue(field, value);
    if (field.kind === "image" && normalized !== null) {
      const imageId = ctx.db.normalizeId("images", String(normalized));
      if (!imageId || !(await ctx.db.get(imageId))) throw new ConvexError("The picture could not be found. Please upload it again.");
      normalized = imageId;
    }
    if (change.op === "create") {
      await ctx.db.patch(changeId, { after: { ...(change.after as object), [field.key]: normalized } });
    } else if (change.op === "update" && change.field === field.key) {
      await ctx.db.patch(changeId, { after: normalized });
    } else {
      throw new ConvexError("This change can't be edited.");
    }
  },
});

/** Removes a change from the draft entirely. */
export const discardChange = mutation({
  args: { changeId: v.id("changes") },
  handler: async (ctx, { changeId }) => {
    await requireAdmin(ctx);
    const { draft, change } = await draftChange(ctx, changeId);
    await removeDraftChange(ctx, draft, change);
  },
});

async function dropPendingImages(ctx: MutationCtx, versionId: Id<"versions">) {
  const pending = await ctx.db
    .query("pendingImages")
    .withIndex("by_version", (q) => q.eq("versionId", versionId))
    .collect();
  for (const p of pending) {
    await ctx.storage.delete(p.storageId);
    await ctx.db.delete(p._id);
  }
}

const ORDER = { create: 0, update: 1, delete: 2 };

/**
 * Applies the draft: every ticked change goes live in this one mutation (all
 * or nothing). A field edited after the AI proposed it keeps the later edit,
 * unless the admin chose to use the AI value anyway. `images` maps each
 * pending picture to the picture the browser made from it.
 */
export const approve = mutation({
  args: {
    draftId: v.id("versions"),
    images: v.array(v.object({ pendingId: v.id("pendingImages"), imageId: v.id("images") })),
  },
  handler: async (ctx, { draftId, images }) => {
    await requireAdmin(ctx);
    const draft = await pendingDraft(ctx);
    if (!draft || draft._id !== draftId) throw new ConvexError("This draft has already been approved or rejected.");
    const imageFor = new Map<string, Id<"images">>();
    for (const { pendingId, imageId } of images) {
      if (!(await ctx.db.get(imageId))) throw new ConvexError("A picture could not be prepared. Please try again.");
      imageFor.set(`${PENDING_PREFIX}${pendingId}`, imageId);
    }
    const resolve = (value: unknown) => {
      if (typeof value !== "string" || !value.startsWith(PENDING_PREFIX)) return value;
      const imageId = imageFor.get(value);
      if (!imageId) throw new ConvexError("A picture in this draft was not prepared. Please try again.");
      return imageId;
    };

    // The draft becomes the newest version: close the CMS sitting and move it
    // to now, so the history stays in the order things went live.
    await closeSittings(ctx);
    const proposals = await draftChanges(ctx, draft._id);
    for (const p of proposals) await ctx.db.delete(p._id);
    const now = Date.now();
    await ctx.db.patch(draft._id, { status: "approved", changeCount: 0, createdAt: now, lastEditAt: now, decidedAt: now });

    // Proposals that are not applied stay in the version, marked, for the record.
    const keep = async (p: Doc<"changes">, mark: { skipped?: boolean; overridden?: boolean }) => {
      const { _id, _creationTime, ...rest } = p;
      await ctx.db.insert("changes", { ...rest, ...mark });
    };

    let applied = 0;
    let kept = 0;
    proposals.sort((a, b) => ORDER[a.op] - ORDER[b.op] || a.editedAt - b.editedAt);
    for (const p of proposals) {
      if (p.skipped) {
        await keep(p, { skipped: true });
        continue;
      }
      const def = ENTITIES[p.entity];
      if (p.op === "create") {
        const record: Record<string, unknown> = {};
        for (const field of def.fields) {
          const value = resolve((p.after as Record<string, unknown>)[field.key] ?? null);
          record[field.key] = normalizeValue(field, value);
        }
        const extra = p.entity === "news" ? { publishedDate: todayIso() } : { createdAt: now };
        await applyTarget(ctx, draft._id, p.entity, p.recordId, "", { ...record, ...extra }, { editedAt: p.editedAt });
        applied++;
        continue;
      }
      const recordId = await resolveRecordId(ctx, p.entity, p.recordId);
      const lastAt =
        p.op === "delete"
          ? await lastRecordEditAt(ctx, p.entity, recordId)
          : Math.max(
              (await lastEditAt(ctx, p.entity, recordId, p.field)) ?? 0,
              (await lastEditAt(ctx, p.entity, recordId, "")) ?? 0,
            );
      if (lastAt !== undefined && lastAt > p.editedAt && !p.force) {
        // A later edit stays on top.
        await keep(p, { overridden: true });
        kept++;
        continue;
      }
      const result = await applyTarget(ctx, draft._id, p.entity, recordId, p.field, p.op === "delete" ? null : resolve(p.after), {
        editedAt: p.op === "delete" ? now : p.editedAt,
      });
      if (result.applied) applied++;
    }

    await dropPendingImages(ctx, draft._id);
    return { applied, kept, versionId: draft._id };
  },
});

export const reject = mutation({
  args: { draftId: v.id("versions") },
  handler: async (ctx, { draftId }) => {
    await requireAdmin(ctx);
    const draft = await pendingDraft(ctx);
    if (!draft || draft._id !== draftId) throw new ConvexError("This draft has already been approved or rejected.");
    await dropPendingImages(ctx, draft._id);
    await ctx.db.patch(draft._id, { status: "rejected", decidedAt: Date.now() });
  },
});

// --- Reading live content (MCP get_page / get_item / find_content) -----------

async function liveItem(ctx: QueryCtx, entity: Entity, doc: Doc<Entity>) {
  const def = ENTITIES[entity];
  const values = snapshot(entity, doc as never);
  return {
    type: def.type,
    id: doc._id as string,
    title: def.title(doc as never),
    fields: await Promise.all(
      def.fields.map(async (f) => ({
        field: fieldKey(entity, doc._id, f.key),
        label: f.label,
        kind: f.kind,
        value: f.kind === "image" ? await displayValue(ctx, f, values[f.key]) : values[f.key],
        ...(f.options ? { options: f.options.map((o) => o.value) } : {}),
      })),
    ),
  };
}

export const getPage = internalQuery({
  args: { type: v.string() },
  handler: async (ctx, { type }) => {
    const def = entityByType(type);
    const docs = (await ctx.db.query(def.entity).collect()) as Doc<Entity>[];
    return { page: def.page, type: def.type, items: await Promise.all(docs.map((d) => liveItem(ctx, def.entity, d))) };
  },
});

export const getItem = internalQuery({
  args: { type: v.string(), id: v.string() },
  handler: async (ctx, { type, id }) => {
    const def = entityByType(type);
    const { live } = await findTarget(ctx, null, def.entity, id);
    return await liveItem(ctx, def.entity, live!);
  },
});

const snippet = (text: string, at: number) => {
  const start = Math.max(0, at - 80);
  const end = Math.min(text.length, at + 160);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
};

/** Every editable field whose text, label, item or page matches the query. */
export const findContent = internalQuery({
  args: { query: v.string(), page: v.optional(v.string()) },
  handler: async (ctx, { query: text, page }) => {
    const terms = text.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) throw new ConvexError("Give some words to search for.");
    const results: { score: number; field: string; label: string; page: string; item: string; value: unknown }[] = [];
    for (const def of Object.values(ENTITIES)) {
      if (page && entityByType(page).entity !== def.entity) continue;
      for (const doc of (await ctx.db.query(def.entity).collect()) as Doc<Entity>[]) {
        const title = def.title(doc as never);
        for (const f of def.fields) {
          const raw = (doc as Record<string, unknown>)[f.key];
          const value = typeof raw === "string" && f.kind !== "image" ? raw : "";
          const haystack = `${value} ${f.label} ${f.key} ${title} ${def.page} ${def.type}`.toLowerCase();
          const inValue = terms.filter((t) => value.toLowerCase().includes(t)).length;
          const anywhere = terms.filter((t) => haystack.includes(t)).length;
          if (anywhere < terms.length) continue;
          const at = terms.length ? value.toLowerCase().indexOf(terms[0]) : -1;
          results.push({
            // Matches in the text itself rank above matches on labels.
            score: inValue * 2 + anywhere,
            field: fieldKey(def.entity, doc._id, f.key),
            label: f.label,
            page: def.page,
            item: title,
            value: f.kind === "image" ? "(picture)" : at >= 0 ? snippet(value, at) : value.slice(0, 240),
          });
        }
      }
    }
    results.sort((a, b) => b.score - a.score);
    return { total: results.length, results: results.slice(0, 30).map(({ score, ...rest }) => rest) };
  },
});
