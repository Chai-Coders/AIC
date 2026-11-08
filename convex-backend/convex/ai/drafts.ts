// The open draft (ChangeSet). Everything the editing agent's tools can write
// goes through here, and only while the draft is in `drafting`. Nothing in this
// file touches live records; once reviewed, send.ts adds the draft to the
// pending AI draft, which the admin approves on the Versions page.
//
// The agent works on top of that pending AI draft: what it reads, and what the
// preview shows, is the live site with the changes already waiting for approval
// applied. Records waiting to be added there have ids like "new-1".
import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, type MutationCtx, type QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { contentTable, type ContentOp, type ContentTable } from "../schema";
import { imageUrl } from "../images";
import { pendingDraft } from "../drafts";
import { resolveRecordId } from "../lib/history";
import { checkTextKey, checkTextValue, TEXTS } from "../lib/siteText";
import { findTextFields, routeOfChange, textField, textKeyForValue } from "./textFields";
import { applyTextOps, applyOps, checkTextField, createDefaults, imageFieldOf, missingForCreate, sameValue, textFieldsOf, type Tables } from "./records";

const PENDING_PICTURE = "pending:";

/** The pending AI draft's ticked changes, as typed ops. */
async function waitingOps(ctx: QueryCtx): Promise<ContentOp[]> {
  const draft = await pendingDraft(ctx);
  if (!draft) return [];
  const changes = await ctx.db
    .query("changes")
    .withIndex("by_version", (q) => q.eq("versionId", draft._id))
    .collect();
  changes.sort((a, b) => a.editedAt - b.editedAt);
  const ops: ContentOp[] = [];
  for (const c of changes) {
    if (c.skipped) continue;
    if (c.entity === "siteText") {
      const def = TEXTS.get(c.recordId);
      if (!def) continue;
      const to = typeof c.after === "string" ? c.after : "";
      ops.push({ op: "text", key: c.recordId, from: null, to: to === def.value ? null : to });
      continue;
    }
    const table = c.entity;
    // A picture an AI app sent is only made into one when the draft is approved.
    const isPending = (value: unknown) => typeof value === "string" && value.startsWith(PENDING_PICTURE);
    if (c.op === "create") {
      const fields = Object.entries((c.after ?? {}) as Record<string, unknown>).map(([k, value]) => [k, isPending(value) ? null : value]);
      ops.push({ op: "create", table, id: c.recordId, doc: { ...createDefaults(table, c.editedAt), ...Object.fromEntries(fields) } });
    } else if (c.op === "delete") {
      ops.push({ op: "delete", table, id: await resolveRecordId(ctx, table, c.recordId), label: "" });
    } else if (!isPending(c.after)) {
      ops.push({ op: "update", table, id: await resolveRecordId(ctx, table, c.recordId), field: c.field, from: c.before, to: c.after });
    }
  }
  return ops;
}

/** Every record, with the pending AI draft applied. */
export async function loadTables(ctx: QueryCtx): Promise<Tables> {
  const [gallery, startups, news, teamMembers] = await Promise.all([
    ctx.db.query("gallery").collect(),
    ctx.db.query("startups").collect(),
    ctx.db.query("news").collect(),
    ctx.db.query("teamMembers").collect(),
  ]);
  return applyOps({ gallery, startups, news, teamMembers }, await waitingOps(ctx));
}

/** Edited website text as { key: value }, with the pending AI draft applied. */
export async function loadTexts(ctx: QueryCtx): Promise<Record<string, string>> {
  const rows = await ctx.db.query("siteText").collect();
  return applyTextOps(Object.fromEntries(rows.map((r) => [r.key, r.value])), await waitingOps(ctx));
}

async function requireDraft(ctx: QueryCtx, changeSetId: Id<"changeSets">) {
  const cs = await ctx.db.get(changeSetId);
  if (!cs) throw new ConvexError("This draft no longer exists.");
  return cs;
}

/** `runSeq` is the agent run making the edit: a stopped run can't write, even once a newer run is going. */
async function requireDrafting(ctx: QueryCtx, changeSetId: Id<"changeSets">, runSeq: number) {
  const cs = await requireDraft(ctx, changeSetId);
  if (cs.runSeq !== runSeq) throw new ConvexError("This step was stopped, so its edit wasn't made.");
  if (cs.status !== "drafting") {
    throw new ConvexError(
      cs.status === "needs_admin"
        ? "The draft is waiting for the admin. Stop here and wait; do not retry this until the admin has answered."
        : `The draft can't be changed while it is ${cs.status}.`,
    );
  }
  return cs;
}

/** Any edit invalidates an earlier review verdict. */
async function patchDraft(ctx: MutationCtx, cs: Doc<"changeSets">, patch: Partial<Doc<"changeSets">>) {
  await ctx.db.patch(cs._id, { ...patch, review: undefined, updatedAt: Date.now() });
}

/** Why a record can't be found: gone, or waiting to be deleted on the Versions page. */
async function missingRecord(ctx: QueryCtx, table: ContentTable, id: string) {
  const docId = ctx.db.normalizeId(table, id);
  if (docId && (await ctx.db.get(docId))) {
    return `That ${table} record is waiting to be deleted on the Versions page, so it can't be changed. Tell the admin; they can untick the delete there.`;
  }
  return `No ${table} record with id ${id}.`;
}

/** A record as the agent sees it: live, or waiting to be added in the pending AI draft. */
const baseDoc = async (ctx: QueryCtx, table: ContentTable, id: string) =>
  ((await loadTables(ctx))[table].find((d) => d._id === id) as Record<string, any> | undefined) ?? null;

// ---- Reading -------------------------------------------------------------

function summarizeDoc(doc: Record<string, any>, full: boolean) {
  const { _creationTime, legacyId, ...rest } = doc;
  void _creationTime;
  void legacyId;
  if (!full && typeof rest.content === "string" && rest.content.length > 400) {
    return { ...rest, content: `${rest.content.slice(0, 400)}… [cut; read this record by id for all of it]` };
  }
  return rest;
}

export const readContent = internalQuery({
  args: { changeSetId: v.id("changeSets"), table: contentTable, query: v.optional(v.string()), id: v.optional(v.string()) },
  handler: async (ctx, { changeSetId, table, query, id }) => {
    const cs = await requireDraft(ctx, changeSetId);
    const docs = applyOps(await loadTables(ctx), cs.contentOps)[table];
    if (id) {
      const doc = docs.find((d) => d._id === id);
      return doc ? { record: summarizeDoc(doc, true) } : { error: `No ${table} record with id ${id}.` };
    }
    const needle = query?.trim().toLowerCase();
    const matches = needle ? docs.filter((d) => JSON.stringify(d).toLowerCase().includes(needle)) : docs;
    return {
      editableTextFields: textFieldsOf(table),
      total: matches.length,
      records: matches.slice(0, 50).map((d) => summarizeDoc(d, false)),
    };
  },
});

const TEXT_RESULT_LIMIT = 40;

/** Website text: what each text shows now, with the draft applied. */
export const readSiteText = internalQuery({
  args: { changeSetId: v.id("changeSets"), query: v.optional(v.string()), page: v.optional(v.string()) },
  handler: async (ctx, { changeSetId, query, page }) => {
    const cs = await requireDraft(ctx, changeSetId);
    const values = applyTextOps(await loadTexts(ctx), cs.contentOps);
    const fields = findTextFields(values, { query, page });
    return {
      total: fields.length,
      texts: fields.slice(0, TEXT_RESULT_LIMIT),
      ...(fields.length > TEXT_RESULT_LIMIT ? { note: `Only the first ${TEXT_RESULT_LIMIT} shown; search for something more specific.` } : {}),
    };
  },
});

export const updateSiteText = internalMutation({
  args: { changeSetId: v.id("changeSets"), runSeq: v.number(), key: v.string(), value: v.union(v.string(), v.null()) },
  handler: async (ctx, { changeSetId, runSeq, key, value }) => {
    const cs = await requireDrafting(ctx, changeSetId, runSeq);
    checkTextKey(key);
    if (!textField(key)) throw new ConvexError(`There is no website text called "${key}". Find its key with get_site_text.`);
    checkTextValue(key, value);
    const from = (await loadTexts(ctx))[key] ?? null;
    const rest = cs.contentOps.filter((op) => !(op.op === "text" && op.key === key));
    const contentOps: ContentOp[] = from === value ? rest : [...rest, { op: "text", key, from, to: value }];
    await patchDraft(ctx, cs, { contentOps });
    return { ok: true };
  },
});

export const searchMedia = internalQuery({
  args: { changeSetId: v.id("changeSets"), query: v.optional(v.string()) },
  handler: async (ctx, { changeSetId, query }) => {
    const cs = await requireDraft(ctx, changeSetId);
    const tables = applyOps(await loadTables(ctx), cs.contentOps);
    const usedBy = new Map<string, { table: string; id: string; label: string; altText: string }[]>();
    for (const table of ["gallery", "startups", "news", "teamMembers"] as const) {
      const field = imageFieldOf(table)!;
      for (const doc of tables[table]) {
        if (!doc[field]) continue;
        const list = usedBy.get(doc[field]) ?? [];
        list.push({ table, id: doc._id, label: doc.subtext || doc.name || doc.title || "", altText: doc.altText ?? "" });
        usedBy.set(doc[field], list);
      }
    }
    const needle = query?.trim().toLowerCase();
    const images = (await ctx.db.query("images").collect())
      .map((image) => ({
        imageId: image._id,
        url: imageUrl(image._id),
        width: image.width,
        height: image.height,
        usedBy: usedBy.get(image._id) ?? [],
      }))
      .filter((image) => !needle || JSON.stringify(image.usedBy).toLowerCase().includes(needle));
    return { totalImages: images.length, images: images.slice(0, 40) };
  },
});

/** The clicked elements, each with the website text it shows, if any. */
export const selectedElements = internalQuery({
  args: { changeSetId: v.id("changeSets") },
  handler: async (ctx, { changeSetId }) => {
    const cs = await requireDraft(ctx, changeSetId);
    const elements = cs.selectedElements ?? [];
    if (!elements.length) return { error: "The admin hasn't pointed at anything." };
    const values = applyTextOps(await loadTexts(ctx), cs.contentOps);
    return {
      elements: elements.map((el) => {
        const key = typeof el.key === "string" && textField(el.key) ? el.key : typeof el.text === "string" ? textKeyForValue(el.text, values) : null;
        return { ...el, key, ...(key ? { showsNow: values[key] ?? textField(key)?.value } : {}) };
      }),
    };
  },
});

// ---- Content edits ---------------------------------------------------------

async function setField(ctx: MutationCtx, cs: Doc<"changeSets">, table: ContentTable, id: string, field: string, value: unknown) {
  if (id.startsWith("new:")) {
    const ops = cs.contentOps.map((op) =>
      op.op === "create" && op.id === id && op.table === table ? { ...op, doc: { ...op.doc, [field]: value } } : op,
    );
    if (!ops.some((op) => op.op === "create" && op.id === id)) throw new ConvexError(`No new record ${id} in this draft.`);
    await patchDraft(ctx, cs, { contentOps: ops });
    return;
  }
  const doc = await baseDoc(ctx, table, id);
  if (!doc) throw new ConvexError(await missingRecord(ctx, table, id));
  if (cs.contentOps.some((op) => op.op === "delete" && op.id === id)) throw new ConvexError("That record is being deleted in this draft.");
  const existing = cs.contentOps.find((op) => op.op === "update" && op.id === id && op.field === field);
  const from = existing?.op === "update" ? existing.from : (doc[field] ?? null);
  const rest = cs.contentOps.filter((op) => op !== existing);
  const contentOps: ContentOp[] = sameValue(from, value) ? rest : [...rest, { op: "update", table, id, field, from, to: value ?? null }];
  await patchDraft(ctx, cs, { contentOps });
}

export const updateRecord = internalMutation({
  args: { changeSetId: v.id("changeSets"), runSeq: v.number(), table: contentTable, id: v.string(), field: v.string(), value: v.string() },
  handler: async (ctx, { changeSetId, runSeq, table, id, field, value }) => {
    const cs = await requireDrafting(ctx, changeSetId, runSeq);
    const checked = checkTextField(table, field, value);
    await setField(ctx, cs, table, id, field, checked);
    return { ok: true };
  },
});

async function requireImageId(ctx: QueryCtx, imageId: string) {
  const id = ctx.db.normalizeId("images", imageId);
  if (!id || !(await ctx.db.get(id))) throw new ConvexError(`No image with id ${imageId}. Find one with search_media.`);
  return id;
}

/**
 * Something new only gets a picture the admin gave for it: a model reaching into
 * the library put other people's photos on new people, and the review passed it.
 */
async function requireAttachedPicture(ctx: QueryCtx, cs: Doc<"changeSets">, imageId: string) {
  if (!(cs.pictures ?? []).some((picture) => picture.imageId === imageId)) {
    throw new ConvexError("New items can only use a picture the admin attached in this chat. Ask the admin to attach one.");
  }
  return await requireImageId(ctx, imageId);
}

export const createRecord = internalMutation({
  args: { changeSetId: v.id("changeSets"), runSeq: v.number(), table: contentTable, fields: v.record(v.string(), v.string()), imageId: v.optional(v.string()) },
  handler: async (ctx, { changeSetId, runSeq, table, fields, imageId }) => {
    const cs = await requireDrafting(ctx, changeSetId, runSeq);
    const doc: Record<string, unknown> = createDefaults(table, Date.now());
    for (const [field, value] of Object.entries(fields)) {
      const checked = checkTextField(table, field, value);
      if (checked !== undefined) doc[field] = checked;
    }
    const imageField = imageFieldOf(table);
    if (imageId && imageField) doc[imageField] = await requireAttachedPicture(ctx, cs, imageId);
    // Alt text describes a picture, so it means nothing without one.
    if (!imageField || !doc[imageField]) delete doc.altText;
    const missing = missingForCreate(table, doc);
    if (missing.length) throw new ConvexError(`A new ${table} record needs: ${missing.join(", ")}.${missing.includes(imageFieldOf(table) ?? "") ? " Ask the admin to attach a picture." : ""}`);
    const taken = cs.contentOps.filter((op) => op.op === "create").map((op) => Number(op.id.slice(4)));
    const id = `new:${Math.max(0, ...taken) + 1}`;
    await patchDraft(ctx, cs, { contentOps: [...cs.contentOps, { op: "create", table, id, doc }] });
    return { ok: true, id };
  },
});

export const swapMedia = internalMutation({
  args: { changeSetId: v.id("changeSets"), runSeq: v.number(), table: contentTable, id: v.string(), imageId: v.string() },
  handler: async (ctx, { changeSetId, runSeq, table, id, imageId }) => {
    const cs = await requireDrafting(ctx, changeSetId, runSeq);
    const field = imageFieldOf(table);
    if (!field) throw new ConvexError(`${table} records don't have a picture to swap.`);
    // Records waiting to be added in the pending AI draft ("new-1") are new too.
    const picture = id.startsWith("new:") || id.startsWith("new-") ? await requireAttachedPicture(ctx, cs, imageId) : await requireImageId(ctx, imageId);
    await setField(ctx, cs, table, id, field, picture);
    return { ok: true };
  },
});

/** Pauses the draft: a delete only enters it once the admin has confirmed. */
export const queueDeleteRecord = internalMutation({
  args: { changeSetId: v.id("changeSets"), runSeq: v.number(), table: contentTable, id: v.string(), reason: v.string() },
  handler: async (ctx, { changeSetId, runSeq, table, id, reason }) => {
    const cs = await requireDrafting(ctx, changeSetId, runSeq);
    if (id.startsWith("new:")) {
      // Never published, so nothing to confirm.
      await patchDraft(ctx, cs, { contentOps: cs.contentOps.filter((op) => !(op.op === "create" && op.id === id)) });
      return { ok: true };
    }
    const doc = await baseDoc(ctx, table, id);
    if (!doc) throw new ConvexError(await missingRecord(ctx, table, id));
    const label = String(doc.title || doc.name || doc.subtext || id);
    await ctx.db.patch(cs._id, {
      status: "needs_admin",
      running: false,
      pendingConfirm: { kind: "delete_record", table, id, label, reason },
      updatedAt: Date.now(),
    });
    return { ok: true, waiting: "Paused until the admin confirms this delete. End your turn now." };
  },
});

/** Called once the admin has confirmed. Adds the pending delete to the draft. */
export async function applyConfirmedDelete(ctx: MutationCtx, cs: Doc<"changeSets">) {
  const pending = cs.pendingConfirm;
  if (!pending?.table || !pending.id) return;
  const contentOps = cs.contentOps.filter((op) => !("id" in op && op.id === pending.id));
  contentOps.push({ op: "delete", table: pending.table, id: pending.id, label: pending.label });
  await patchDraft(ctx, cs, { contentOps, pendingConfirm: undefined });
}

export const describeChange = internalMutation({
  args: {
    changeSetId: v.id("changeSets"), runSeq: v.number(),
    summary: v.string(),
    page: v.optional(v.string()),
    textKey: v.optional(v.string()),
    selector: v.optional(v.string()),
    text: v.optional(v.string()),
    beforeText: v.optional(v.string()),
  },
  handler: async (ctx, { changeSetId, runSeq, ...item }) => {
    const cs = await requireDrafting(ctx, changeSetId, runSeq);
    await patchDraft(ctx, cs, { changeList: [...cs.changeList, { ...item, page: routeOfChange(item.page, item.textKey) }] });
    return { ok: true, changeNumber: cs.changeList.length + 1 };
  },
});

/** For a change that no longer applies, so the walkthrough stays true. */
export const removeChange = internalMutation({
  args: { changeSetId: v.id("changeSets"), runSeq: v.number(), summary: v.string() },
  handler: async (ctx, { changeSetId, runSeq, summary }) => {
    const cs = await requireDrafting(ctx, changeSetId, runSeq);
    // By its words: parallel tool calls can add items in any order, so numbers aren't reliable.
    const changeList = cs.changeList.filter((item) => item.summary !== summary);
    if (changeList.length === cs.changeList.length) {
      throw new ConvexError(`No change is described as "${summary}". The list has: ${cs.changeList.map((item) => item.summary).join("; ") || "nothing yet"}.`);
    }
    await patchDraft(ctx, cs, { changeList });
    return { ok: true, remaining: changeList.length };
  },
});

export const stepState = internalQuery({
  args: { changeSetId: v.id("changeSets") },
  handler: async (ctx, { changeSetId }) => await ctx.db.get(changeSetId),
});
