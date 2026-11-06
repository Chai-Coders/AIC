# Progress: CMS over MCP, with version control

Plan: `idea.md`. Branch: `migrations`. Decisions and gotchas: `memory.md`.

## Steps

- [x] 1. Versions core
  - [x] Field registry (`convex/lib/registry.ts`)
  - [x] Tables: versions, changes, fieldEdits, recordAliases, settings
  - [x] CMS edits recorded, grouped per sitting (30 min default), merged per field
  - [x] Old pictures kept for history; cleanup counts history pictures
  - [x] Undo version (chosen changes), put back one change, restore website to a point
  - [x] Versions page: History timeline (filters, day groups, Live now / Undone badges)
  - [x] Version detail: before/after per field with word diff, picture thumbnails,
        Undo these changes (tick list), Put back one field, older/newer links
  - [x] Restore page: preview Now -> After restoring, untick to keep
  - [x] Sign-out closes the sitting (setting UI comes with the AI connection page)
- [x] 2. MCP server and tools (temporary token: `npx convex run oauth:createTestToken '{"email":"…"}'`)
  - [x] /mcp: stateless Streamable HTTP JSON-RPC, hand-written (no SDK needed in Convex)
  - [x] Tools: find_content, get_page, get_item, propose_edit/create/delete, propose_image,
        request_upload_link, view_draft, undo_change. No publish tool.
  - [x] Draft: one pending version, merged per field; approve (all or nothing, later edits on
        top, force per field), reject (kept in history)
  - [x] Waiting for approval tab: tick/untick, edit AI value, use AI value anyway,
        upload missing pictures, approve and publish / reject all
- [x] 3. OAuth login, AI connection page
  - [x] Discovery (/.well-known/oauth-protected-resource[/mcp], oauth-authorization-server),
        dynamic registration, CMS consent page /oauth/authorize (PKCE S256 only), /oauth/token
        (code + refresh, rotating), 401 + WWW-Authenticate on /mcp
  - [x] AI connection page: address + copy, per-app setup, how it works, examples,
        connected apps + Disconnect, can / can't, sitting length setting
  - [x] Login keeps the query string when returning (needed for the consent page)
  - [x] cms_gui/vercel.json: SPA rewrites so /oauth/authorize and /upload/... load directly
  - [x] Daily cleanup of expired codes / tokens / links and abandoned registrations
- [x] 4. Pictures: URL download (https only, private hosts blocked, 10 MB, image/* only),
        one-time upload links (/upload/<token>, 1 h), WebP copies made in the browser on approve,
        cleanup keeps pictures used by history and pending drafts
- [ ] 5. `find_content` across every field

## Log

- 2026-11-06: backend for step 1 done and tested on the local deployment
  (edit merge, undo one field, delete + restore to point).
- 2026-11-06: Versions UI done; checked with headless Chromium (desktop + phone).
- 2026-11-06: MCP tested with curl (auth challenge, tools, validation, SSRF block, image via redirect);
  approve flow tested in headless browser (override kept, edited value, uploaded logo).
- 2026-11-06: OAuth tested end to end (login round-trip, consent, PKCE, code/refresh reuse
  rejected); upload link tested (upload, reuse blocked).
