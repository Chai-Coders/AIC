import { defineSchema, defineTable } from "convex/server";
import { v, type Infer } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { entity } from "./lib/registry";

// Which group a person is listed under on the website. Mentors are split into
// the four groups the mentors page shows as tabs.
export const teamCategory = v.union(
  v.literal("team"),
  v.literal("governor"),
  v.literal("mentor_intl_industry"),
  v.literal("mentor_intl_academic"),
  v.literal("mentor_india_industry"),
  v.literal("mentor_india_academic"),
);

export type TeamCategory = Infer<typeof teamCategory>;

// ---------------------------------------------------------------------------
// AI Assistant (see docs/ai-agent.md)
// ---------------------------------------------------------------------------

// Rows saved by earlier versions of this feature can hold values and fields nothing
// uses now. They stay allowed, because Convex refuses a deploy when any saved row
// doesn't fit the schema.
export const changeSetStatus = v.union(
  v.literal("drafting"), // the editor agent is working
  v.literal("reviewing"), // the review agent is checking the draft
  v.literal("needs_admin"), // waiting on the admin: a delete to confirm, or a review objection
  v.literal("building"), // older rows only
  v.literal("publishing"), // older rows only
  v.literal("ready"), // older rows only
  v.literal("published"), // older rows only
  // Passed review and added to the pending AI draft, which the admin approves
  // or rejects on the Versions page (drafts.ts). The chat starts a new one next.
  v.literal("sent"),
  v.literal("discarded"),
  v.literal("failed"),
);
export type ChangeSetStatus = Infer<typeof changeSetStatus>;

// Tables the agent may change through the content path.
export const contentTable = v.union(
  v.literal("gallery"),
  v.literal("startups"),
  v.literal("news"),
  v.literal("teamMembers"),
);
export type ContentTable = Infer<typeof contentTable>;

// One typed edit to a CMS record, turned into changes in the pending AI draft
// when it's sent (ai/send.ts). Ids of records created in this ChangeSet are
// "new:<n>"; records already waiting in the pending AI draft are "new-<n>".
export const contentOp = v.union(
  v.object({
    op: v.literal("update"),
    table: contentTable,
    id: v.string(),
    field: v.string(),
    from: v.any(),
    to: v.any(),
  }),
  v.object({ op: v.literal("create"), table: contentTable, id: v.string(), doc: v.any() }),
  v.object({ op: v.literal("delete"), table: contentTable, id: v.string(), label: v.string() }),
  // Website text (the `siteText` table), by key. `null` means the text written
  // in frontend/src/content/registry.js, with no row in the table.
  v.object({ op: v.literal("text"), key: v.string(), from: v.union(v.string(), v.null()), to: v.union(v.string(), v.null()) }),
);
export type ContentOp = Infer<typeof contentOp>;

// One plain-English item for the walkthrough.
export const changeItem = v.object({
  summary: v.string(),
  kind: v.optional(v.string()), // older rows only
  // Website route where the change shows, e.g. "/summary".
  page: v.optional(v.string()),
  // How to find the element: a website text's key, a CSS selector, and/or text it contains.
  textKey: v.optional(v.string()),
  selector: v.optional(v.string()),
  text: v.optional(v.string()),
  // The text to look for in the "before" version, when it differs.
  beforeText: v.optional(v.string()),
});

// A change the admin must confirm before it enters the draft.
export const pendingConfirm = v.object({
  kind: v.union(v.literal("delete_record"), v.literal("delete_file")), // delete_file: older rows only
  table: v.optional(contentTable),
  id: v.optional(v.string()),
  path: v.optional(v.string()), // older rows only
  label: v.string(),
  reason: v.string(),
});

export const providerName = v.union(v.literal("anthropic"), v.literal("openai"), v.literal("google"));
export type ProviderName = Infer<typeof providerName>;

export const modelRef = v.object({ provider: providerName, model: v.string() });
export type ModelRef = Infer<typeof modelRef>;

export default defineSchema({
  // users, authAccounts, authSessions, ... Every user is a CMS admin: there is
  // no public sign-up, accounts are created with `admin:createAdmin`.
  ...authTables,

  // One uploaded picture, stored as several WebP copies of increasing width so
  // pages can load the smallest one that looks sharp (see http.ts, /img/).
  images: defineTable({
    variants: v.array(v.object({ width: v.number(), storageId: v.id("_storage") })),
    // Size of the largest copy, for width/height attributes.
    width: v.number(),
    height: v.number(),
  }),

  // `legacyId` is the record's id in the old Django database. It is set only by
  // the one-time import (scripts/migrate-from-django.mjs) so it can be re-run.

  // Like Django, `createdAt` is also bumped on every edit, so the most recently
  // touched items are listed first.
  gallery: defineTable({
    imageId: v.id("images"),
    // Text read out by screen readers in place of the picture.
    altText: v.optional(v.string()),
    subtext: v.string(),
    createdAt: v.number(),
    legacyId: v.optional(v.number()),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_legacyId", ["legacyId"]),

  startups: defineTable({
    name: v.string(),
    description: v.string(),
    logoId: v.id("images"),
    altText: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    createdAt: v.number(),
    legacyId: v.optional(v.number()),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_legacyId", ["legacyId"]),

  news: defineTable({
    title: v.string(),
    subtitle: v.string(),
    content: v.string(),
    thumbnailId: v.id("images"),
    altText: v.optional(v.string()),
    // ISO date, YYYY-MM-DD.
    publishedDate: v.string(),
    legacyId: v.optional(v.number()),
  })
    .index("by_publishedDate", ["publishedDate"])
    .index("by_legacyId", ["legacyId"]),

  teamMembers: defineTable({
    name: v.string(),
    role: v.string(),
    category: teamCategory,
    // Board members imported from the old site have no photo yet.
    photoId: v.optional(v.id("images")),
    altText: v.optional(v.string()),
    bio: v.string(),
    createdAt: v.number(),
    legacyId: v.optional(v.number()),
  })
    .index("by_name", ["name"])
    .index("by_legacyId", ["legacyId"]),

  // At most one row: the video playing behind the homepage hero (hosted on Mux).
  backgroundVideo: defineTable({
    videoName: v.string(),
    videoUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),
    muxAssetId: v.optional(v.string()),
    muxPlaybackId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // Website text edited in the CMS's "Site text" page. Only edited texts have a
  // row: everything else shows the text written in the website's code
  // (frontend/src/content/registry.js), which is also what a deleted row means.
  // `key` names the text, like "home.hero.title".
  siteText: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // Videos uploaded from the CMS that Mux is still processing. Once Mux has a
  // playback id the upload replaces the background video (see mux.ts).
  muxUploads: defineTable({
    uploadId: v.string(),
    videoName: v.string(),
    status: v.union(v.literal("waiting"), v.literal("ready"), v.literal("errored")),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_uploadId", ["uploadId"]),
  // --- Version history (see versions.ts and lib/history.ts) -------------------
  // One linear history, like git without branches: every change to the website
  // belongs to a version, and versions are only ever appended. Undoing or
  // restoring adds a new version on top.
  //   cms       edits saved in the CMS, grouped into one version per sitting
  //             (open while the admin keeps editing, closed after a pause)
  //   mcp       changes an AI app proposed; one `pending` draft at a time,
  //             then `approved` (applied) or `rejected` (kept for the record)
  //   rollback  an undo or restore, applied immediately
  versions: defineTable({
    source: v.union(v.literal("cms"), v.literal("mcp"), v.literal("rollback")),
    status: v.union(
      v.literal("open"),
      v.literal("closed"),
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    // For rollbacks: what was undone. `undo` puts back one version's changes,
    // `restore` puts the site back to how it was right after that version,
    // `revert` puts back a single change.
    rollbackKind: v.optional(v.union(v.literal("undo"), v.literal("restore"), v.literal("revert"))),
    revertsVersionId: v.optional(v.id("versions")),
    // AI drafts: the app that proposed it and its own summary.
    app: v.optional(v.string()),
    note: v.optional(v.string()),
    changeCount: v.number(),
    createdAt: v.number(),
    lastEditAt: v.number(),
    decidedAt: v.optional(v.number()),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_status", ["status"])
    .index("by_reverts", ["revertsVersionId"]),

  // One changed field (`field` set) or one added / deleted record (`field` is
  // ""; `before` / `after` then hold the whole record, null when absent).
  // `before` and `after` use null for an empty value.
  changes: defineTable({
    versionId: v.id("versions"),
    entity,
    // The record's id. In a draft, records the AI wants to add are "new-1", ...
    recordId: v.string(),
    field: v.string(),
    op: v.union(v.literal("create"), v.literal("update"), v.literal("delete")),
    before: v.any(),
    after: v.any(),
    // When the change was made; a later edit to the same field stays on top.
    editedAt: v.number(),
    // Draft: unticked by the admin, so not applied.
    skipped: v.optional(v.boolean()),
    // Draft: the field was edited after this was proposed. Not applied unless
    // the admin chose "use the AI value anyway" (`force`).
    force: v.optional(v.boolean()),
    // Approved draft: not applied because a later edit was kept.
    overridden: v.optional(v.boolean()),
  })
    .index("by_version", ["versionId"])
    .index("by_version_record", ["versionId", "entity", "recordId"]),

  // When each live field (or, with field "", the record itself) last changed.
  // This is what "a later edit stays on top" compares against.
  fieldEdits: defineTable({
    entity,
    recordId: v.string(),
    field: v.string(),
    lastEditedAt: v.number(),
  }).index("by_field", ["entity", "recordId", "field"]),

  // A deleted record that was put back gets a new id; older changes still use
  // the old one and are followed through here.
  recordAliases: defineTable({
    entity,
    fromId: v.string(),
    toId: v.string(),
  }).index("by_from", ["entity", "fromId"]),

  // At most one row.
  settings: defineTable({
    // A CMS sitting ends after this many minutes without an edit.
    sittingMinutes: v.number(),
  }),

  // Originals of pictures in the pending AI draft (from a URL or an upload
  // link). The CMS makes the WebP copies when the draft is approved.
  pendingImages: defineTable({
    versionId: v.id("versions"),
    storageId: v.id("_storage"),
    sourceUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_version", ["versionId"]),

  // One-time links where the admin drops a picture for the AI draft.
  uploadTokens: defineTable({
    tokenHash: v.string(),
    // The AI app that asked for the link.
    app: v.string(),
    entity,
    recordId: v.string(),
    field: v.string(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
  }).index("by_tokenHash", ["tokenHash"]),

  // --- AI connections over OAuth (see oauth.ts) --------------------------------
  oauthClients: defineTable({
    clientId: v.string(),
    name: v.string(),
    redirectUris: v.array(v.string()),
    createdAt: v.number(),
  }).index("by_clientId", ["clientId"]),

  oauthCodes: defineTable({
    codeHash: v.string(),
    clientId: v.string(),
    userId: v.id("users"),
    redirectUri: v.string(),
    codeChallenge: v.string(),
    expiresAt: v.number(),
  }).index("by_codeHash", ["codeHash"]),

  // Tokens are stored as SHA-256 hashes. A refresh replaces the row.
  oauthTokens: defineTable({
    clientId: v.string(),
    userId: v.id("users"),
    accessHash: v.string(),
    refreshHash: v.string(),
    accessExpiresAt: v.number(),
    refreshExpiresAt: v.number(),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
  })
    .index("by_accessHash", ["accessHash"])
    .index("by_refreshHash", ["refreshHash"])
    .index("by_clientId", ["clientId"]),

  // ---- AI Assistant ----------------------------------------------------

  // One draft per admin request, from the first edit to publish or discard.
  changeSets: defineTable({
    threadId: v.string(),
    title: v.string(),
    status: changeSetStatus,
    contentOps: v.array(contentOp),
    changeList: v.array(changeItem),
    reviewAttempts: v.number(),
    review: v.optional(
      v.object({ verdict: v.union(v.literal("approved"), v.literal("rejected")), reasons: v.array(v.string()), at: v.number() }),
    ),
    pendingConfirm: v.optional(pendingConfirm),
    // Why the agent stopped, in words for the admin (spend cap, error, ...).
    notice: v.optional(v.string()),
    editorModel: modelRef,
    reviewerModel: modelRef,
    // Set while an agent step is scheduled or running, so only one runs.
    running: v.optional(v.boolean()),
    // Bumped each time the agent is started or stopped; a step holding an older
    // number gives up, so a stopped run can't carry on.
    runSeq: v.optional(v.number()),
    // The admin message the editor is answering, and model calls made for it.
    promptMessageId: v.optional(v.string()),
    stepCount: v.optional(v.number()),
    // The elements the admin clicked in the preview.
    selectedElements: v.optional(v.array(v.any())),
    // Older drafts hold these. Nothing reads them now, but dropping a field that
    // saved rows still have makes Convex refuse every deploy.
    selectedElement: v.optional(v.any()),
    codeEdits: v.optional(v.any()),
    baseCommitSha: v.optional(v.string()),
    buildAttempts: v.optional(v.number()),
    buildError: v.optional(v.string()),
    // Pictures the admin attached in the chat, for the agent to use.
    pictures: v.optional(v.array(v.object({ imageId: v.id("images"), name: v.string() }))),
    // Times this run has waited out the provider's rate limit.
    rateLimitWaits: v.optional(v.number()),
    // The pending AI draft this was sent to.
    versionId: v.optional(v.id("versions")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_threadId", ["threadId"])
    .index("by_status", ["status"])
    .index("by_createdBy", ["createdBy", "createdAt"]),


  // Every prompt, tool call, review verdict, publish and rollback.
  auditLog: defineTable({
    userId: v.optional(v.id("users")),
    action: v.string(),
    changeSetId: v.optional(v.id("changeSets")),
    // The model that did it, when one did.
    model: v.optional(v.string()),
    detail: v.any(),
    costUsd: v.optional(v.number()),
    at: v.number(),
  })
    .index("by_at", ["at"])
    .index("by_changeSet", ["changeSetId", "at"]),

  // Tokens and cost of each model call.
  usage: defineTable({
    month: v.string(), // YYYY-MM (UTC)
    provider: v.string(),
    model: v.string(),
    role: v.union(v.literal("editor"), v.literal("reviewer")),
    inputTokens: v.number(),
    outputTokens: v.number(),
    costUsd: v.number(),
    changeSetId: v.optional(v.id("changeSets")),
    at: v.number(),
  }).index("by_month", ["month"]),

  // Model names and prices, kept current by ai/prices.ts. What the admin sets in
  // aiSettings.priceTable wins over these.
  modelPrices: defineTable({
    provider: providerName,
    model: v.string(),
    name: v.string(),
    inputPerMTok: v.number(),
    outputPerMTok: v.number(),
    source: v.union(v.literal("official"), v.literal("agreed"), v.literal("unconfirmed")),
    sourceLabel: v.string(),
    // Whether the saved key can use it. Absent when that isn't known.
    available: v.optional(v.boolean()),
    // A new price looked wrong, so the last one is still in use.
    held: v.optional(v.boolean()),
    checkedAt: v.number(),
  }),

  // One row of agent settings. API keys are encrypted (AES-GCM, key in the
  // AI_SETTINGS_KEY environment variable) and never sent to the browser.
  aiSettings: defineTable({
    providers: v.array(
      v.object({ name: providerName, ciphertext: v.string(), iv: v.string(), last4: v.string(), updatedAt: v.number() }),
    ),
    editorModel: modelRef,
    reviewerModel: modelRef,
    monthlyBudgetUsd: v.number(),
    // USD per million tokens.
    priceTable: v.array(
      v.object({ provider: providerName, model: v.string(), inputPerMTok: v.number(), outputPerMTok: v.number(), source: v.optional(v.string()) }),
    ),
    pricesUpdatedAt: v.number(),
    // What the last automatic price check found.
    priceCheck: v.optional(v.any()),
    updatedAt: v.number(),
  }),
});
