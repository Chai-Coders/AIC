# AIC CMS AI Agent — Progress

Design doc: `AIC CMS AI Agent — Design Doc.md` (repo root, not committed; frozen).
Setup and behaviour: `docs/ai-agent.md`. Tests: `convex-backend/tests/ai/README.md`.
Last updated: 2026-11-07.

## Branch status

Work is on `migrations-johny`, with `migrations` merged in up to d109e45 (Abhijith's Site text editor).
All commits for this feature go to `migrations-johny` only.

## Decisions

- Convex backend and the CMS run locally for now. Containers come later.
- **Changes are saved to Convex only. The agent doesn't touch source code or GitHub** (Johnston, 2026-11-07).
- **The preview is the real website in a frame**, as on the Site text page, not a Sandpack sandbox (2026-11-07).
- **Scope: data only** (Johnston, 2026-11-07): text anywhere, new sections, people, startups, news, contact details.
  Styling, layout and a design catalogue are left out for now.
- Budget currency: USD.
- Align with Abhijith's Site text work. Sanjay's later work on `migrations` is deliberately not looked at or merged.

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
- **New sections** come from one built-in shape stored in `pageSections`, not new code.
- **Tools.** `get_site_text`, `update_site_text`, `get_page_sections`, `add_person`, `add_startup`, `add_news`,
  `add_gallery_photo`, `add_section` and `remove_change` are additions; the code tools and `create_record` are gone.

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

## Verified against real services

Gemini (`gemini-3.5-flash-lite`, free plan), from plain-English requests: website text, removing text, contact details, a
link, a new governor, mentor and team member, a startup and a news post with an attached picture, and a new section. A section
and a governor were published and checked on the public site. A startup with no logo correctly asks for one.

Other tests use a scripted fake model. Claude's request shape was checked against a fake; OpenAI has no default prices. On
2026-11-07 `gemini-3.8-flash` was returning 503 (high demand), and `gemini-2.5-flash-lite` returned 404 for new users though
Google's pricing page still lists it.

Real price sources, 2026-11-07: all four answered, and the prices were checked by hand against the official pages. They
settled the one disagreement between the lists (`gemini-3.8-flash` is $0.75 on Google's page). OpenAI's prices come only from the
two lists, since its page refuses automated requests.

## Open

- The agent can't change styling or layout, which the doc's goals include. Left out for now by decision.
- Sections have no CMS page of their own: they are added, changed and removed through the assistant.
- The site's own logo is a file in the code, so the agent can't change it and says so.
- Not yet run on real Gemini (daily free limit reached on 2026-11-07): the review seeing the editor's reply, so a draft isn't rejected
  because the agent said it can't change the site's logo. Checked with the fake model only.

- The spend meter is an estimate, not a provider balance: a normal API key can't read one. Anthropic and OpenAI have admin
  APIs for real costs, which need a separate admin key. Google has no equivalent.

## Follow-ups

- Prompt caching for the editor: each step resends the conversation, so this is the biggest saving available.
- A container build of `convex-backend/` needs `frontend/src/content/registry.js` in its build context.
