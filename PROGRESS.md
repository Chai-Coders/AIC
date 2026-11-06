# AIC CMS AI Agent — Progress

Design doc: `AIC CMS AI Agent — Design Doc.md` (repo root, not committed).
Setup and behaviour: `docs/ai-agent.md`. Tests: `convex-backend/tests/ai/README.md`.
Last updated: 2026-11-06.

## Branch status

Work is on `migrations-johny`, based on `migrations` at 7678a0a. `migrations` is untouched.

## Decisions from the open questions (answered 2026-11-06)

- Convex backend: runs locally (`npx convex dev`). Containers come later.
- CMS (`cms_gui/`): runs locally for now. Containers come later.
- Preview: edits are shown in the right pane, next to the chat on the left. `frontend/` renders
  live; `convex-backend/` and `cms_gui/` changes show as a plain-English list and diff.
- Branch: feature work goes to `migrations-johny`. The agent's Publish target also defaults to it.
- Protected files: **not answered; enforced as the lean.** The list goes beyond the proposal
  (see below). One file to change: `convex-backend/convex/ai/protected.ts`.
- Budget currency: **not answered; USD as the lean.**

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
| 7 | Hardening | ✅ `tests/ai`: 17 backend checks and 8 browser scenarios |

## Not verified yet

All tests use a scripted fake model and a fake GitHub. Nothing has run against a real provider
or the real GitHub API, because that needs your keys and would spend money or commit to a public repo.
Try next, in order:

1. A real provider key, with a content edit. Then check the spend meter against the provider's own usage page.
2. A real `GITHUB_TOKEN`, with a small `frontend/` edit, publish and rollback on a scratch branch (`GITHUB_BRANCH`).
3. A mixed change, to see whether Vercel's checks report on the branch. If nothing deploys it, use Apply content.
4. OpenAI and Gemini: same code path, but only Anthropic's request shape was checked, and they have no default prices.

## Choices beyond the design doc

- Protected list also covers `schema.ts`, `admin.ts`, `AuthContext`, `LoginPage`, `services/convex.js`,
  `package.json` and lockfiles, build and deploy settings, and scripts. Dependency and build files run
  code on install or build, which is the obvious path for instructions hidden in content.
- Two extra tables, `repoFiles` and `repoCache`, hold the cached copy of the branch. The doc lists 5 new tables.
- Publish also stops on content conflicts (a record changed since the draft), not just file changes.
- A draft with a failing build can't be published even by override; a review objection can.
- `edit_file` accepts exact replacements as well as whole files, to cut token cost. Drafts still store whole files.
- The preview drives `sandpack-client` directly. `SandpackProvider` loses its client under StrictMode, which
  silently dropped all file updates and errors; the Phase 0 gate only tested first render, so it didn't show.

## Follow-ups

- Prompt caching for the editor: each step resends the conversation, so this is the biggest saving available.
- `docs/ai-agent.md` lists the known limits.
