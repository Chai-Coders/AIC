# AI Assistant

An admin chats on the left of the CMS's AI Assistant page and watches a live preview
of the public site on the right. The agent edits CMS records (content path) and source
files (code path). Everything goes into a draft; nothing goes live until the review
agent has passed it and the admin presses Publish. Every publish can be rolled back.

The content path has two parts: **records** (gallery, startups, news, team, background
video) and **website text**, the wording on the pages. Website text is defined with its
defaults in `frontend/src/content/registry.js`, and edits are rows in the `siteText` table,
which override the defaults. The CMS's Site text page edits the same rows by hand. So the
agent changes existing wording with `update_site_text`, never by editing the registry or
a component, because a row would override that code edit and it might not show. New wording
for a new section does go in the code, under a new key.

The design is in `AIC CMS AI Agent — Design Doc.md`; progress is in `PROGRESS.md`.

## Setup

Set these on the Convex deployment with `npx convex env set NAME value`:

| Variable | What it is |
| --- | --- |
| `AI_SETTINGS_KEY` | Encrypts provider API keys. `openssl rand -base64 32`. Changing it makes saved keys unreadable. |
| `GITHUB_TOKEN` | Fine-grained token scoped to this repo only: Contents read/write, Commit statuses and Checks read. Needed for the code path. |
| `GITHUB_REPO` | `Chai-Coders/AIC` |
| `GITHUB_BRANCH` | Optional. The branch the agent reads and Publish commits to. Default: `migrations-johny`. |

Then, in the CMS, open **AI settings**, add a provider key, and check the model and budget.
Without the GitHub variables the content path still works, and the preview uses the
copy of `frontend/` bundled into the CMS.

Local development:

```sh
cd convex-backend && NODE_OPTIONS=--dns-result-order=ipv4first CONVEX_AGENT_MODE=anonymous npx convex dev --typecheck disable
cd frontend && VITE_CONVEX_URL=http://127.0.0.1:3210 VITE_CMS_URL=http://localhost:5175 npx vite --port 5174
cd cms_gui && VITE_CONVEX_URL=http://127.0.0.1:3210 VITE_SITE_URL=http://localhost:5174 npx vite --port 5175
```

Chrome may ask to allow the HTTPS preview sandbox to reach localhost (Local Network
Access). Allow it. This doesn't apply in production.

## How a request flows

`drafting` → `building` (only if `frontend/` changed) → `reviewing` → `ready` → `publishing` → `published`

- **Editing** runs as one scheduled action per model call, so long tasks stay inside
  Convex's action time limit and the spend cap is checked before every call.
- **Build check:** the admin's browser compiles the draft in the preview, opens the changed
  pages, and reports the result. **The check needs the AI Assistant page open**; if it's
  closed, the draft waits in `building`. Failures go back to the editor up to twice.
- **Review:** a rejection goes back to the editor up to twice, then the admin decides and
  can "Publish anyway" (logged). A review with no verdict counts as an objection.
- **Deletes** pause for the admin before they enter the draft.
- **Publish** commits code first and stops if a file changed on the branch since the draft
  started. In a mixed change, content is written after the commit's checks pass. If nothing
  reports a deploy within 5 minutes (for example, nothing deploys this branch), the admin
  can press Apply content.
- **Rollback** (AI history) is a new commit and/or restores only the fields that publish
  changed. It stops if those files or fields were edited afterwards. Deleted records come
  back with a new id; their pictures are kept for this reason, so deleted records' images
  stay in storage.

## What the agent can't do

- Edit protected files, listed with reasons in `convex-backend/convex/ai/protected.ts`:
  sign-in, the admin check, admin accounts, the agent's own code and limits, the schema,
  `package.json` and lockfiles, build and deploy settings, generated code and scripts.
- Read `.env` files or key files. They are never cached.
- Upload or edit pictures.
- See API keys, the GitHub token or admin credentials. They stay inside actions.

## Known limits

- **Spend:** cost is tokens × the price table on the settings page. Cached tokens are counted
  at the full input price and no prompt caching is requested, so the meter errs high and
  long chats cost more than they could. Haiku 5.5 charges more above 100K-token prompts
  ($0.50/$2.50), which the single-rate table doesn't capture.
- **Backend and CMS changes** can't be previewed or built here. They show as a diff in the
  Changes tab, are reviewed more strictly, and need a developer to deploy after Publish.
- **Build check coverage:** it compiles every edited website file and opens pages named in the
  change list. A broken export used by a page it didn't open is only caught by review.
- **Website text keys:** the backend bundles `registry.js` to know which texts exist, so a key
  added there can be edited by the agent once the backend is redeployed. A container build
  of `convex-backend/` will need `frontend/src/content/registry.js` in its build context.
- **Draft size:** a draft holds up to about 800 KB of file contents.
- **Dev server:** after pulling new `frontend/` files, restart the CMS dev server. Without a
  GitHub token the preview uses a file list Vite doesn't refresh for folders outside the CMS.
- **Preview host:** the sandbox runs on CodeSandbox's hosted bundler, so draft site code and
  content reach that origin in the admin's browser. Self-host the bundler to avoid it
  (`bundlerURL` in `SitePreview.jsx`).
- The public website keeps reading live content; preview data is admin-only.

## Tests

See `convex-backend/tests/ai/README.md`.
