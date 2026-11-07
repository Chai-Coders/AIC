# AIC CMS AI Agent — Progress

Design doc: `AIC CMS AI Agent — Design Doc.md` (repo root, not committed; frozen).
Setup and behaviour: `docs/ai-agent.md`. Tests: `convex-backend/tests/ai/README.md`.
Last updated: 2026-11-07.

## Branch status

`migrations-johny` is merged into `migrations` (2026-11-07), with these changes so the assistant follows the same
rules as AI apps over MCP:

- **Approval is on the Versions page.** A draft the review passes is sent to the pending AI draft there (status
  `sent`), the same one MCP apps add to; the admin approves or rejects it there. The assistant's own Publish,
  rollback and `versions` table are gone; undo is the Versions page's. "Publish anyway" became "Send anyway".
- **Field rules come from the version history's registry** (`convex/lib/registry.ts`), which now includes alt text.
  Website text rules (link addresses) are shared by the Site text page, MCP and the assistant (`lib/siteText.ts`).
- **The assistant builds on what's waiting**: it reads, and the preview shows, the live site with the pending AI
  draft applied.
- **Removed for now:** added page sections, the background video, gallery and startup reordering, and setting a news
  date, since the version history doesn't track them yet.
- **One Settings page** (tabs: AI model config, MCP, Version history) replaces AI settings and AI connection. The
  assistant's step-by-step log is the **AI activity** tab on the Versions page. Price sources, hand-entered prices
  and the MCP how-to/examples were removed.

## Decisions

- Convex backend and the CMS run locally for now. Containers come later.
- **Changes are saved to Convex only. The agent doesn't touch source code or GitHub** (Johnston, 2026-11-07).
- **The preview is the real website in a frame**, as on the Site text page, not a Sandpack sandbox (2026-11-07).
- **Scope: data only** (Johnston, 2026-11-07): text anywhere, people, startups, news, contact details. (New sections
  were removed at the merge, 2026-11-07.)
  Styling, layout and a design catalogue are left out for now.
- Budget currency: USD.
- Align with Abhijith's Site text work. Merged with Sanjay's `migrations` (version history, MCP) on 2026-11-07.

## Where the build differs from the design doc

The design doc is frozen and stays as it was approved. These differences are recorded here instead.

- **Edit paths.** The doc has a content path and a code path, with Publish committing through GitHub. Only the
  content path exists. So the agent can't change layout, styling or components, which the doc's goals include.
- **Build check, protected files, deploy wait, code rollback.** These existed only for the code path and are gone.
- **Preview.** The doc says Sandpack, with Vercel previews as the fallback. It's the real site in a frame, which also
  means no Sandpack dependency.
- **Hardcoded text.** The doc says it stays in code for v1. Abhijith's work moved it into `registry.js` with a `siteText`
  override table, and the agent edits those rows with `get_site_text` and `update_site_text`.
- **Pointing** takes up to 10 elements at once. The doc describes one.
- **Media.** The doc says no uploads. Pictures can be attached in the chat, because new startups and news need one and
  the alternative was reusing unrelated pictures.
- **Tools.** `get_site_text`, `update_site_text`, `add_person`, `add_startup`, `add_news`, `add_gallery_photo` and
  `remove_change` are additions; the code tools, `create_record`, and (at the merge) `get_page_sections`, `add_section`
  and `reorder` are gone.
- **Publish and rollback** are the Versions page's approve and undo (merge, 2026-11-07).

## Phases

Numbered 0–7 here; the design doc numbers them 1–8.

| # | Phase | Status |
|---|-------|--------|
| 0 | Preview | ✅ Real site in a frame: same images, buttons, links, headings and fonts as the public site on 11 pages |
| 1 | Backend foundation | ✅ |
| 2 | Content path | ✅ |
| 3 | AI Assistant page | ✅ |
| 4 | Code path | ❌ Removed by decision |
| 5 | Review agent | ✅ |
| 6 | Click to point | ✅ Several at once |
| 7 | Hardening | ✅ `tests/ai` |

## Verified after the merge (2026-11-07)

Against a local deployment with the fake model: `tests/ai/e2e.mjs` all 33 pass, including new checks that a sent draft
waits on the Versions page, follow-ups build on it, MCP proposals and the assistant share one draft, a later CMS edit
stays on top, and a draft whose record was deleted is not sent. `tests/ai/ui.mjs`: every step passes except the
pixel-position comparison, which differs by 2–3 px on a different page each run (lazy-loaded pictures). Not yet run on
real Gemini or Claude after the merge.

## Verified against real services (before the merge)

Gemini (`gemini-3.5-flash-lite`, free plan), from plain-English requests: website text, removing text, contact details, a
link, a new governor, mentor and team member, a startup and a news post with an attached picture, and a new section
(sections were removed at the merge). A section and a governor were published and checked on the public site. A startup with no logo correctly asks for one.

Other tests use a scripted fake model. Claude's request shape was checked against a fake; OpenAI has no default prices. On
2026-11-07 `gemini-3.8-flash` was returning 503 (high demand), and `gemini-2.5-flash-lite` returned 404 for new users though
Google's pricing page still lists it.

Real price sources, 2026-11-07: all four answered, and the prices were checked by hand against the official pages. They
settled the one disagreement between the lists (`gemini-3.8-flash` is $0.75 on Google's page). OpenAI's prices come only from the
two lists, since its page refuses automated requests.

## Open

- The agent can't change styling or layout, which the doc's goals include. Left out for now by decision.
- Added page sections, the background video and reordering could come back once the version history tracks them.
- The site's own logo is a file in the code, so the agent can't change it and says so.
- Not yet run on real Gemini (daily free limit reached on 2026-11-07): the review seeing the editor's reply, so a draft isn't rejected
  because the agent said it can't change the site's logo. Checked with the fake model only.

- The spend meter is an estimate, not a provider balance: a normal API key can't read one. Anthropic and OpenAI have admin
  APIs for real costs, which need a separate admin key. Google has no equivalent.

## Follow-ups

- Prompt caching for the editor: each step resends the conversation, so this is the biggest saving available.
- A container build of `convex-backend/` needs `frontend/src/content/registry.js` in its build context.
