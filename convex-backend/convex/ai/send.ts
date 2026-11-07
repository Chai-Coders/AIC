// Sending: once the review agent has passed a draft (or the admin overrides
// its objection), its changes join the pending AI draft, the same one AI apps
// add to over MCP (../drafts.ts). Nothing goes live here: the admin approves
// or rejects that draft on the Versions page, and approving makes it the
// newest version, which can be undone like any other.
import { ConvexError, v } from "convex/values";
import { mutation, type MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { draftChanges, findTarget, openDraft, pendingDraft } from "../drafts";
import { requireAdmin } from "../lib/access";
import { addChange, getRecord, resolveRecordId } from "../lib/history";
import { ENTITIES, fieldDef, fullSnapshot, normalizeValue } from "../lib/registry";
import { checkTextValue, TEXTS, textDoc } from "../lib/siteText";
import type { ContentOp } from "../schema";
import { audit } from "./audit";

/** How the Versions page names who proposed the changes. */
export const ASSISTANT_APP = "AI Assistant";

const errorText = (e: unknown) => (e instanceof ConvexError ? String(e.data) : e instanceof Error ? e.message : String(e));

type Planned = Parameters<typeof addChange>[2];

/**
 * The draft's ops as changes for the pending AI draft. Checks everything
 * first, so a draft is sent whole or not at all. Returns what's wrong instead
 * when something no longer applies, e.g. a record deleted since.
 */
async function plan(ctx: MutationCtx, versionId: Id<"versions"> | null, ops: ContentOp[], now: number) {
  const changes: Planned[] = [];
  const problems: string[] = [];
  let next = 1;
  if (versionId) {
    const taken = new Set((await draftChanges(ctx, versionId)).map((c) => c.recordId));
    while (taken.has(`new-${next}`)) next++;
  }
  for (const op of ops) {
    try {
      if (op.op === "text") {
        checkTextValue(op.key, op.to);
        const live = await textDoc(ctx, op.key);
        const after = op.to ?? TEXTS.get(op.key)!.value;
        changes.push({ entity: "siteText", recordId: op.key, field: "value", op: "update", before: live?.value ?? null, after, editedAt: now });
        continue;
      }
      const def = ENTITIES[op.table];
      if (op.op === "create") {
        const record: Record<string, unknown> = {};
        for (const field of def.fields) record[field.key] = normalizeValue(field, op.doc[field.key] ?? null);
        changes.push({ entity: op.table, recordId: `new-${next++}`, field: "", op: "create", before: null, after: record, editedAt: now });
        continue;
      }
      // A record waiting to be added in the pending AI draft.
      if (op.id.startsWith("new-")) {
        const waiting = versionId ? await findTarget(ctx, versionId, op.table, op.id).catch(() => null) : null;
        if (!waiting) {
          // Already gone, so there's nothing left to delete.
          if (op.op === "delete") continue;
          problems.push(`a new ${def.noun} it changes is no longer waiting on the Versions page`);
          continue;
        }
        changes.push(
          op.op === "delete"
            ? { entity: op.table, recordId: op.id, field: "", op: "delete", before: null, after: null, editedAt: now }
            : { entity: op.table, recordId: op.id, field: op.field, op: "update", before: null, after: normalizeValue(fieldDef(op.table, op.field), op.to), editedAt: now },
        );
        continue;
      }
      const recordId = await resolveRecordId(ctx, op.table, op.id);
      const live = (await getRecord(ctx, op.table, recordId)) as (Doc<typeof op.table> & Record<string, unknown>) | null;
      if (!live) {
        problems.push(op.op === "delete" ? `the ${def.noun} "${op.label}" has already been deleted` : `a ${def.noun} it changes has been deleted`);
        continue;
      }
      if (op.op === "delete") {
        changes.push({ entity: op.table, recordId, field: "", op: "delete", before: fullSnapshot(live), after: null, editedAt: now });
        continue;
      }
      const field = fieldDef(op.table, op.field);
      const after = normalizeValue(field, op.to);
      const before = live[field.key] ?? null;
      // Back to the live value: addChange takes an earlier proposal for the field back.
      changes.push({ entity: op.table, recordId, field: field.key, op: "update", before, after, editedAt: now });
    } catch (e) {
      problems.push(errorText(e));
    }
  }
  return { changes, problems };
}

/**
 * Adds a reviewed draft to the pending AI draft and closes it. Returns the
 * problems instead, changing nothing, when part of it no longer applies.
 */
export async function sendToVersions(ctx: MutationCtx, cs: Doc<"changeSets">, action: "sent" | "sent.overrideReview", userId?: Id<"users">) {
  const now = Date.now();
  const { changes, problems } = await plan(ctx, (await pendingDraft(ctx))?._id ?? null, cs.contentOps, now);
  if (problems.length) return { problems };
  const versionId = await openDraft(ctx, ASSISTANT_APP);
  for (const change of changes) await addChange(ctx, versionId, change);
  await ctx.db.patch(cs._id, { status: "sent", versionId, running: false, notice: undefined, pendingConfirm: undefined, updatedAt: now });
  await audit(ctx, { userId: userId ?? cs.createdBy, changeSetId: cs._id, action, detail: { versionId, changes: changes.length, reasons: cs.review?.reasons } });
  return { problems: [] };
}

/** The words for the admin when a draft couldn't be sent. */
export const cantSendNotice = (problems: string[]) =>
  `This couldn't be sent to the Versions page, because ${problems.join("; ")}. Nothing was sent. Tell the assistant what to do, or discard the draft.`;

/** The review objected and the admin sends the draft anyway. */
export const sendAnyway = mutation({
  args: { changeSetId: v.id("changeSets") },
  handler: async (ctx, { changeSetId }) => {
    const userId = await requireAdmin(ctx);
    const cs = await ctx.db.get(changeSetId);
    if (!cs || cs.createdBy !== userId) throw new ConvexError("This draft no longer exists.");
    if (cs.status !== "needs_admin" || cs.review?.verdict !== "rejected" || cs.pendingConfirm || cs.running) {
      throw new ConvexError("This draft can't be sent now.");
    }
    if (!cs.contentOps.length) throw new ConvexError("This draft has no changes to send.");
    const { problems } = await sendToVersions(ctx, cs, "sent.overrideReview", userId);
    if (problems.length) throw new ConvexError(cantSendNotice(problems));
  },
});
