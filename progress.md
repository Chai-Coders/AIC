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
- [ ] 2. MCP server and tools (temporary token)
- [ ] 3. OAuth login, AI connection page
- [ ] 4. Pictures: URL download, upload links, resizing on approve
- [ ] 5. `find_content` across every field

## Log

- 2026-11-06: backend for step 1 done and tested on the local deployment
  (edit merge, undo one field, delete + restore to point).
- 2026-11-06: Versions UI done; checked with headless Chromium (desktop + phone).
