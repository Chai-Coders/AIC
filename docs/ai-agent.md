# AI Assistant

An admin chats on the left of the CMS's AI Assistant page and watches the public site on
the right, with the draft applied. The agent changes what the site stores in Convex: website
text and records. Everything goes into a draft; nothing goes live until the review agent has
passed it and the admin presses Publish. Every publish can be rolled back.

The agent never touches source code or GitHub. Publishing writes to the Convex tables, and the
public site reads them.

The design is in `AIC CMS AI Agent — Design Doc.md`; `PROGRESS.md` records where the build differs.

## What it can change

- **Website text**, anywhere on the pages. Defaults are in `frontend/src/content/registry.js`, and edits
  are rows in the `siteText` table, which override them. The Site text page edits the same rows by hand.
  Setting a text to empty removes it from the page, and the original can be put back.
- **Contact details and links.** The address, emails and phone numbers are website text (`contact.*`). So
  are social media, form and map links (`links.*`), which must be full web addresses. Only the social links
  can be blank, which takes their icon off the footer.
- **Records**: new and changed team members, governors and mentors, startups, news, gallery photos and
  the background video.
- **New sections**, anywhere between the parts of a page, stored in the `pageSections` table: heading, text,
  and optionally a small line above the heading, a picture, a button and a white background. They use the
  site's own styles. `frontend/src/content/sectionMap.js` lists where they can go on each page.
- **Pictures**: attach them in the chat. New items can only use an attached picture, which the server
  enforces, because a model left to choose put other people's photos on new people. So a new startup or
  news post asks for one. A new person or section doesn't need one. Existing records can swap to a library
  picture when asked. No image editing.

The backend bundles `registry.js` and `sectionMap.js` to know which texts and places exist, so one added there
can be used once the backend is redeployed.

It can't change layout, styling or colours, remove a built-in section (only empty its text), or add new kinds
of feature. It says so.

## Setup

Set this on the Convex deployment with `npx convex env set NAME value`:

| Variable | What it is |
| --- | --- |
| `AI_SETTINGS_KEY` | Encrypts provider API keys. `openssl rand -base64 32`. Changing it makes saved keys unreadable. |

The website needs `VITE_CMS_URL` set to the CMS's address, and the CMS needs `VITE_SITE_URL` set to the
website's. The preview won't load without them; the page says so if it doesn't.

Then, in the CMS, open **AI settings**, add a provider key, and check the model and budget. Saving a key
is enough to start: if the chosen model's provider has no key, the assistant uses a default from a
provider that has one.

**Testing for free:** a Google AI Studio key works on Google's free plan. Free plans have low limits, and
Google may use free-plan content to improve its products, so use the paid plan for anything private. The
meter counts paid rates, so it reads high on the free plan.

Local development:

```sh
cd convex-backend && NODE_OPTIONS=--dns-result-order=ipv4first CONVEX_AGENT_MODE=anonymous npx convex dev --typecheck disable
cd frontend && VITE_CONVEX_URL=http://127.0.0.1:3210 VITE_CMS_URL=http://localhost:5175 npx vite --port 5174 --strictPort
cd cms_gui && VITE_CONVEX_URL=http://127.0.0.1:3210 VITE_SITE_URL=http://localhost:5174 npx vite --port 5175 --strictPort
```

## How a request flows

`drafting` → `reviewing` → `ready` → `published`

- **Editing** runs as one scheduled action per model call, so long tasks stay inside Convex's action time
  limit and the spend cap is checked before every call.
- **Review:** a rejection goes back to the editor up to twice, then the admin decides and can "Publish
  anyway" (logged). A review with no verdict counts as an objection.
- **Deletes** pause for the admin before they enter the draft.
- **Pictures** in open drafts, on sections, or restorable by a rollback are kept by the daily cleanup of unused
  pictures. Attached pictures that end up unused go after a day.
- **Publish** is one Convex transaction, so it either all happens or none of it does. It stops if a text or
  record changed since the draft was made.
- **Rollback** (AI history) restores only the fields that publish changed, and stops if they were edited
  afterwards. Deleted records come back with a new id; their pictures are kept for this reason.

## The preview

The right pane is the real website in a frame (`?cms-edit=1&cms-agent=1`), the same approach as the Site
text page, so it looks exactly like the public site. `frontend/src/content/AgentBridge.jsx` runs only in
that mode, and only exchanges messages with `VITE_CMS_URL`. On Desktop the frame is laid out at the width of
the admin's window and scaled down to fit the pane, since the site's layout changes with width. The CMS sends it the draft; it's held in memory
and never written to the browser cache the public site reads. A draft applies without a reload.

The preview wraps each website text in an `<aic-text>` element so it can be found and pointed at. It isn't a `<span>`
because the site's styles have rules like `.program__stage span`, which would restyle the wrapper too.

Every change in a draft stays marked and numbered on the page, in green. When the agent finishes, the preview goes to each
change made since the admin's last message, one every few seconds, and stops on the last. The arrows take over at any time.

## The public site's cache

The site renders from its last known copy, then refreshes in the background. A copy this page load fetched in the last
minute is used without asking the server, so moving between pages stays instant. A reload, or coming back to the tab, always
asks, so a publish or rollback shows at once. A tab left open and untouched keeps what it has until the visitor moves between
pages or comes back to it.

## When the agent asks

It works for AIC IIITK: "our", "we" and "our logo" mean the incubator, and startups are other companies. It asks instead of
guessing when it doesn't know what to change, what it should become, or a new item's required details. The site's own logo is
in the code, so it says it can't change that. Up to 3 pictures can be attached to a message.

## Known limits

- **Busy models and limits:** when a provider is overloaded or a limit is hit, the assistant waits and retries
  up to 4 times (a notice says so), then stops and keeps the draft. Each model call has a 3-minute time limit.
- **Spend:** cost is tokens × the price table on the settings page. Cached tokens are counted at the full input
  price and no prompt caching is requested, so the meter errs high and long chats cost more than they could.
- **Website deploy:** the frontend must be deployed with `AgentBridge.jsx` for the preview to work in production.

## Tests

See `convex-backend/tests/ai/README.md`.
