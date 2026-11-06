// The open draft (ChangeSet). Everything the editing agent's tools can write
// goes through here, and only while the draft is in `drafting`. Nothing in this
// file touches live records or the branch; see publish.ts for that.
import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, type MutationCtx, type QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { contentTable, type ContentOp, type ContentTable } from "../schema";
import { imageUrl } from "../images";
import { checkSiteText } from "../siteText";
import { findTextFields, textField, textKeyForValue } from "./textFields";
import { applyTextOps, canReorder, applyOps, checkTextField, createDefaults, imageFieldOf, missingForCreate, sameValue, textFieldsOf, type Tables } from "./records";
import { cleanPath, editBlockedReason, isSecretPath, newFileBlockedReason } from "./protected";

// A Convex document can hold 1 MiB and a draft keeps whole files.
const MAX_DRAFT_CODE_CHARS = 800_000;
const MAX_READ_CHARS = 60_000;
const SEARCH_LIMIT = 30;

export async function loadTables(ctx: QueryCtx): Promise<Tables> {
  const [gallery, startups, news, teamMembers, backgroundVideo] = await Promise.all([
    ctx.db.query("gallery").collect(),
    ctx.db.query("startups").collect(),
    ctx.db.query("news").collect(),
    ctx.db.query("teamMembers").collect(),
    ctx.db.query("backgroundVideo").collect(),
  ]);
  return { gallery, startups, news, teamMembers, backgroundVideo };
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

/** Any edit invalidates an earlier review verdict and build error. */
async function patchDraft(ctx: MutationCtx, cs: Doc<"changeSets">, patch: Partial<Doc<"changeSets">>) {
  await ctx.db.patch(cs._id, { ...patch, review: undefined, buildError: undefined, updatedAt: Date.now() });
}

const realDoc = async (ctx: QueryCtx, table: ContentTable, id: string) => {
  const docId = ctx.db.normalizeId(table, id);
  return docId ? ((await ctx.db.get(docId)) as Record<string, any> | null) : null;
};

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
    const rows = await ctx.db.query("siteText").collect();
    const values = applyTextOps(rows, cs.contentOps);
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
    checkSiteText(key, value);
    if (!textField(key)) throw new ConvexError(`There is no website text called "${key}". Find its key with get_site_text.`);
    const row = await ctx.db.query("siteText").withIndex("by_key", (q) => q.eq("key", key)).unique();
    const from = row?.value ?? null;
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
    const videos = tables.backgroundVideo
      .filter((video) => !needle || String(video.videoName).toLowerCase().includes(needle))
      .map((video) => ({ id: video._id, name: video.videoName, url: video.videoUrl }));
    return { totalImages: images.length, images: images.slice(0, 40), videos };
  },
});

/** Text of one path with the draft applied. Undefined when it doesn't exist. */
async function draftFile(ctx: QueryCtx, cs: Doc<"changeSets">, path: string) {
  const edit = cs.codeEdits.find((e) => e.path === path);
  if (edit) return { content: edit.content, inDraft: true };
  const row = await ctx.db.query("repoFiles").withIndex("by_path", (q) => q.eq("path", path)).unique();
  if (!row) return { content: null as string | null, inDraft: false, missing: true };
  return { content: row.content, inDraft: false, binary: row.content === null };
}

export const readFile = internalQuery({
  args: { changeSetId: v.id("changeSets"), path: v.string(), fromLine: v.optional(v.number()), toLine: v.optional(v.number()) },
  handler: async (ctx, { changeSetId, path, fromLine, toLine }) => {
    const cs = await requireDraft(ctx, changeSetId);
    const clean = cleanPath(path);
    if (!clean || isSecretPath(clean)) return { error: "That file can't be read." };
    if (!(await ctx.db.query("repoCache").first())) return { error: "Code changes aren't set up: there is no copy of the repository on the server." };
    const file = await draftFile(ctx, cs, clean);
    if (file.content === null) {
      return { error: file.binary ? "That is a binary file." : `${clean} doesn't exist.` };
    }
    const lines = file.content.split("\n");
    const start = Math.max(1, fromLine ?? 1);
    const end = Math.min(lines.length, toLine ?? lines.length);
    const text = lines.slice(start - 1, end).join("\n");
    const blocked = editBlockedReason(clean);
    return {
      path: clean,
      totalLines: lines.length,
      fromLine: start,
      toLine: end,
      inDraft: file.inDraft,
      ...(blocked ? { readOnly: `This file can't be edited: ${blocked}.` } : {}),
      ...(text.length > MAX_READ_CHARS
        ? { content: text.slice(0, MAX_READ_CHARS), cut: "Too long to read at once; ask for a line range." }
        : { content: text }),
    };
  },
});

async function searchFiles(ctx: QueryCtx, cs: Doc<"changeSets">, query: string, folder?: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const edits = new Map(cs.codeEdits.map((e) => [e.path, e.content]));
  const rows = await ctx.db.query("repoFiles").collect();
  const files = rows.filter((r) => !edits.has(r.path)).map((r) => ({ path: r.path, content: r.content }));
  for (const [path, content] of edits) files.push({ path, content });
  const hits: { path: string; line: number; text: string }[] = [];
  for (const file of files) {
    if (file.content === null || (folder && !file.path.startsWith(folder))) continue;
    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length && hits.length < SEARCH_LIMIT; i++) {
      if (lines[i].toLowerCase().includes(needle)) hits.push({ path: file.path, line: i + 1, text: lines[i].trim().slice(0, 200) });
    }
    if (hits.length >= SEARCH_LIMIT) break;
  }
  return hits;
}

export const searchCode = internalQuery({
  args: { changeSetId: v.id("changeSets"), query: v.string(), folder: v.optional(v.string()) },
  handler: async (ctx, { changeSetId, query, folder }) => {
    const cs = await requireDraft(ctx, changeSetId);
    if (!(await ctx.db.query("repoCache").first())) return { error: "Code changes aren't set up: there is no copy of the repository on the server." };
    const hits = await searchFiles(ctx, cs, query, folder);
    return { matches: hits, ...(hits.length >= SEARCH_LIMIT ? { note: `Only the first ${SEARCH_LIMIT} shown; search for something more specific.` } : {}) };
  },
});

/** The clicked element, with where it most likely lives in the source. */
export const selectedElement = internalQuery({
  args: { changeSetId: v.id("changeSets") },
  handler: async (ctx, { changeSetId }) => {
    const cs = await requireDraft(ctx, changeSetId);
    const el = cs.selectedElement;
    if (!el) return { error: "The admin hasn't pointed at anything." };
    const candidates = [el.text, ...(el.classes ?? []), el.sectionHeading].filter((x) => typeof x === "string" && x.trim());
    let nearestSource: { path: string; line: number; text: string }[] = [];
    for (const candidate of candidates) {
      // Long text wraps across JSX lines, so match on its first words.
      const snippet = candidate.trim().split("\n")[0].slice(0, 60);
      nearestSource = await searchFiles(ctx, cs, snippet, "frontend/src/");
      if (nearestSource.length) break;
    }
    // Most wording is website text, edited with update_site_text, not in the source.
    const values = applyTextOps(await ctx.db.query("siteText").collect(), cs.contentOps);
    const siteTextKey = typeof el.text === "string" ? textKeyForValue(el.text, values) : null;
    return { element: el, ...(siteTextKey ? { siteTextKey } : {}), nearestSource: nearestSource.slice(0, 5) };
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
  const doc = await realDoc(ctx, table, id);
  if (!doc) throw new ConvexError(`No ${table} record with id ${id}.`);
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
    await setField(ctx, cs, table, id, field, checkTextField(table, field, value));
    return { ok: true };
  },
});

async function requireImageId(ctx: QueryCtx, imageId: string) {
  const id = ctx.db.normalizeId("images", imageId);
  if (!id || !(await ctx.db.get(id))) throw new ConvexError(`No image with id ${imageId}. Find one with search_media.`);
  return id;
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
    if (imageId && imageField) doc[imageField] = await requireImageId(ctx, imageId);
    const missing = missingForCreate(table, doc);
    if (missing.length) throw new ConvexError(`A new ${table} record needs: ${missing.join(", ")}.`);
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
    await setField(ctx, cs, table, id, field, await requireImageId(ctx, imageId));
    return { ok: true };
  },
});

export const reorder = internalMutation({
  args: { changeSetId: v.id("changeSets"), runSeq: v.number(), table: contentTable, ids: v.array(v.string()) },
  handler: async (ctx, { changeSetId, runSeq, table, ids }) => {
    const cs = await requireDrafting(ctx, changeSetId, runSeq);
    if (!canReorder(table)) {
      throw new ConvexError(table === "news" ? "News is ordered by date; change publishedDate instead." : `${table} has no manual order.`);
    }
    if (new Set(ids).size !== ids.length || ids.length < 2) throw new ConvexError("List at least two different record ids, in the new order.");
    const docs = applyOps(await loadTables(ctx), cs.contentOps)[table];
    const unknown = ids.filter((id) => !docs.some((d) => d._id === id));
    if (unknown.length) throw new ConvexError(`Not in ${table}: ${unknown.join(", ")}.`);
    if (ids.some((id) => id.startsWith("new:"))) throw new ConvexError("Records new in this draft are listed first and can't be reordered yet.");
    const rest = cs.contentOps.filter((op) => !(op.op === "reorder" && op.table === table));
    await patchDraft(ctx, cs, { contentOps: [...rest, { op: "reorder", table, ids }] });
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
    const doc = await realDoc(ctx, table, id);
    if (!doc) throw new ConvexError(`No ${table} record with id ${id}.`);
    const label = String(doc.title || doc.name || doc.subtext || doc.videoName || id);
    await ctx.db.patch(cs._id, {
      status: "needs_admin",
      running: false,
      pendingConfirm: { kind: "delete_record", table, id, label, reason },
      updatedAt: Date.now(),
    });
    return { ok: true, waiting: "Paused until the admin confirms this delete. End your turn now." };
  },
});

// ---- Code edits ------------------------------------------------------------

async function writeFile(ctx: MutationCtx, cs: Doc<"changeSets">, path: string, content: string | null) {
  const row = await ctx.db.query("repoFiles").withIndex("by_path", (q) => q.eq("path", path)).unique();
  const previous = cs.codeEdits.find((e) => e.path === path);
  const baseSha = previous ? previous.baseSha : (row?.sha ?? null);
  const rest = cs.codeEdits.filter((e) => e.path !== path);
  const unchanged = row ? row.content === content : content === null;
  const codeEdits = unchanged ? rest : [...rest, { path, content, baseSha }];
  const size = codeEdits.reduce((sum, e) => sum + (e.content?.length ?? 0), 0);
  if (size > MAX_DRAFT_CODE_CHARS) {
    throw new ConvexError("This draft has grown too large to store. Publish or discard it, then make the rest as a separate request.");
  }
  const cache = await ctx.db.query("repoCache").first();
  await patchDraft(ctx, cs, { codeEdits, baseCommitSha: cs.baseCommitSha ?? cache?.commitSha });
}

function editablePath(path: string) {
  const clean = cleanPath(path);
  if (!clean) throw new ConvexError(`"${path}" isn't a valid path.`);
  const blocked = editBlockedReason(clean);
  if (blocked) throw new ConvexError(`${clean} can't be edited by the AI Assistant: ${blocked}. Tell the admin a developer has to make this change.`);
  return clean;
}

/** Whole new contents, or exact replacements (cheaper for large files). */
export const editFile = internalMutation({
  args: {
    changeSetId: v.id("changeSets"), runSeq: v.number(),
    path: v.string(),
    content: v.optional(v.string()),
    replacements: v.optional(v.array(v.object({ find: v.string(), replace: v.string() }))),
  },
  handler: async (ctx, { changeSetId, runSeq, path, content, replacements }) => {
    const cs = await requireDrafting(ctx, changeSetId, runSeq);
    const clean = editablePath(path);
    const current = await draftFile(ctx, cs, clean);
    if (current.content === null) throw new ConvexError(`${clean} doesn't exist. Use create_file, or read the file first.`);
    let next = content ?? current.content;
    if (content === undefined && !replacements?.length) throw new ConvexError("Give either content or replacements.");
    for (const { find, replace } of replacements ?? []) {
      const count = find ? next.split(find).length - 1 : 0;
      if (count !== 1) {
        throw new ConvexError(`"${find.slice(0, 80)}" appears ${count} times in ${clean}; it must match exactly once. Read the file and use a longer, exact snippet.`);
      }
      next = next.replace(find, () => replace);
    }
    await writeFile(ctx, cs, clean, next);
    return { ok: true, path: clean, lines: next.split("\n").length };
  },
});

export const createFile = internalMutation({
  args: { changeSetId: v.id("changeSets"), runSeq: v.number(), path: v.string(), content: v.string() },
  handler: async (ctx, { changeSetId, runSeq, path, content }) => {
    const cs = await requireDrafting(ctx, changeSetId, runSeq);
    const clean = editablePath(path);
    const current = await draftFile(ctx, cs, clean);
    if (current.content !== null || current.binary) throw new ConvexError(`${clean} already exists. Use edit_file.`);
    const blocked = newFileBlockedReason(clean);
    if (blocked) throw new ConvexError(`${clean} can't be edited by the AI Assistant: ${blocked}. Tell the admin a developer has to make this change.`);
    await writeFile(ctx, cs, clean, content);
    return { ok: true, path: clean };
  },
});

export const queueDeleteFile = internalMutation({
  args: { changeSetId: v.id("changeSets"), runSeq: v.number(), path: v.string(), reason: v.string() },
  handler: async (ctx, { changeSetId, runSeq, path, reason }) => {
    const cs = await requireDrafting(ctx, changeSetId, runSeq);
    const clean = editablePath(path);
    const edit = cs.codeEdits.find((e) => e.path === clean);
    if (edit && edit.baseSha === null) {
      // Only exists in this draft, so nothing to confirm.
      await patchDraft(ctx, cs, { codeEdits: cs.codeEdits.filter((e) => e !== edit) });
      return { ok: true };
    }
    if ((await draftFile(ctx, cs, clean)).content === null) throw new ConvexError(`${clean} doesn't exist.`);
    await ctx.db.patch(cs._id, {
      status: "needs_admin",
      running: false,
      pendingConfirm: { kind: "delete_file", path: clean, label: clean, reason },
      updatedAt: Date.now(),
    });
    return { ok: true, waiting: "Paused until the admin confirms this delete. End your turn now." };
  },
});

/** Called once the admin has confirmed. Adds the pending delete to the draft. */
export async function applyConfirmedDelete(ctx: MutationCtx, cs: Doc<"changeSets">) {
  const pending = cs.pendingConfirm;
  if (!pending) return;
  if (pending.kind === "delete_record") {
    const contentOps = cs.contentOps.filter((op) => !("id" in op && op.id === pending.id));
    contentOps.push({ op: "delete", table: pending.table!, id: pending.id!, label: pending.label });
    await patchDraft(ctx, cs, { contentOps, pendingConfirm: undefined });
  } else {
    await writeFile(ctx, cs, pending.path!, null);
    await ctx.db.patch(cs._id, { pendingConfirm: undefined });
  }
}

export const describeChange = internalMutation({
  args: {
    changeSetId: v.id("changeSets"), runSeq: v.number(),
    summary: v.string(),
    kind: v.union(v.literal("content"), v.literal("code")),
    page: v.optional(v.string()),
    selector: v.optional(v.string()),
    text: v.optional(v.string()),
    beforeText: v.optional(v.string()),
  },
  handler: async (ctx, { changeSetId, runSeq, ...item }) => {
    const cs = await requireDrafting(ctx, changeSetId, runSeq);
    await patchDraft(ctx, cs, { changeList: [...cs.changeList, item] });
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
