# AIC CMS AI Agent — Progress

Design doc: `AIC CMS AI Agent — Design Doc.md` (repo root, not committed).
Setup and behaviour: `docs/ai-agent.md`. Tests: `convex-backend/tests/ai/README.md`.
Last updated: 2026-11-06.

## Branch status

Work is on `migrations-johny`, with `migrations` merged in up to d109e45 (Abhijith's Site text editor).
All commits for this feature go to `migrations-johny` only. `migrations` itself is untouched.

## Decisions from the open questions (answered 2026-11-06)

- Convex backend: runs locally (`npx convex dev`). Containers come later.
- CMS (`cms_gui/`): runs locally for now. Containers come later.
- Preview: edits are shown in the right pane, next to the chat on the left. `frontend/` renders
  live; `convex-backend/` and `cms_gui/` changes show as a plain-English list and diff.
- Branch: feature work goes to `migrations-johny`. The agent's Publish target also defaults to it.
- Protected files: enforced, confirmed by Johnston. The list goes beyond the proposal (see below).
  One file to change: `convex-backend/convex/ai/protected.ts`.
- Budget currency: USD, confirmed by Johnston.
- Align with Abhijith's version of `migrations`, confirmed by Johnston. **The design doc doesn't change.**

## Phases

Numbered 0–7 here; the design doc numbers them 1–8.

| # | Phase | Status |
|---|-------|--------|
| 0 | Sandpack prototype | ✅ Gate re-run on the final preview code: 0.00% pixel difference on /, /summary, /news, /aicteam |
| 1 | Backend foundation | ✅ |
| 2 | Content path | ✅ |
| 3 | AI Assistant page | ✅ |
| 4 | Code path | ✅ against a fake GitHub. ⚠️ Not yet run against the real API |
| 5 | Review agent | ✅ |
| 6 | Click to point | ✅ |
| 7 | Hardening | ✅ `tests/ai`: 25 backend checks and 10 browser scenarios, on the merged code |

## Where the build differs from the design doc

The design doc is frozen and stays as it was approved. These differences are recorded here instead.

- **Hardcoded text.** The doc says hardcoded text stays in code for v1, the agent edits it there, and moving it
  into the CMS is a later phase. Abhijith's work on `migrations` has since moved it into `registry.js` with a
  `siteText` override table. To align with it, website text is part of the content path: `get_site_text` and
  `update_site_text`, with a typed `text` op that previews, publishes and rolls back like other content.
- **Agent tools.** The two tools above are additions to the doc's tool list.
- **Tables.** `siteText` is Abhijith's. `repoFiles` and `repoCache` hold the cached branch. The doc lists 5 new tables.

## Waiting on a decision

`origin/migrations` moved on after this merge, to e6fe753 (Sanjay's version history, MCP server and AI connection).
It isn't merged here: it adds its own `versions` table with a different shape, and its own AI draft, approval and
undo flow, overlapping the ChangeSet and rollback flow here. Merging conflicts in 7 files and means choosing one system.

## Reviews (2026-11-06)

- Security review: no finding reached the confidence bar. Its hardening notes are applied (more build files and
  entry points protected, no new files under `convex-backend/convex/`, stricter path checks).
- Code review: 9 of 10 findings fixed. Not changed, because the design doc lets the agent edit these folders: the
  agent can still add exports to existing `convex/*.ts` files, and `registry.js` being plain data is checked only by
  the review agent. A real fix is making `convex-backend/` read-only for the agent and importing the registry as JSON.

## Not verified yet

All tests use a scripted fake model and a fake GitHub. Nothing has run against a real provider
or the real GitHub API, because that needs your keys and would spend money or commit to a public repo.
Try next, in order:

1. A real provider key, with a content edit. Then check the spend meter against the provider's own usage page.
2. A real `GITHUB_TOKEN`, with a small `frontend/` edit, publish and rollback on a scratch branch (`GITHUB_BRANCH`).
3. A mixed change, to see whether Vercel's checks report on the branch. If nothing deploys it, use Apply content.
4. OpenAI and Gemini: same code path, but only Anthropic's request shape was checked, and they have no default prices.

## Choices beyond the design doc

- Protected list also covers `schema.ts`, `admin.ts`, `http.ts`, `crons.ts`, `AuthContext`, `LoginPage`,
  `services/convex.js`, the CMS's `main.jsx` and `index.html`, `package.json` and lockfiles, build and deploy
  settings, and scripts. The agent also can't add new files under `convex-backend/convex/`. Dependency and build files run
  code on install or build, which is the obvious path for instructions hidden in content.
- Publish also stops on content conflicts (a record changed since the draft), not just file changes.
- A draft with a failing build can't be published even by override; a review objection can.
- `edit_file` accepts exact replacements as well as whole files, to cut token cost. Drafts still store whole files.
- The preview drives `sandpack-client` directly. `SandpackProvider` loses its client under StrictMode, which
  silently dropped all file updates and errors; the Phase 0 gate only tested first render, so it didn't show.

## Follow-ups

- Prompt caching for the editor: each step resends the conversation, so this is the biggest saving available.
- `docs/ai-agent.md` lists the known limits.
