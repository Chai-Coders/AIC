# AI Assistant

An admin chats on the left of the CMS's AI Assistant page and watches the public site on
the right, with the draft applied. The agent changes what the site stores in Convex: website
text and records. It follows the same rules as AI apps connected over MCP: everything goes into
a draft, and once the review agent has passed it, the draft joins the **pending AI draft on the
Versions page**, the same one MCP apps add to. Nothing goes live until the admin approves it
there, and approving makes it the newest version in the history, which can be undone like any
other.

The agent never touches source code or GitHub.

The design is in `AIC CMS AI Agent — Design Doc.md`; `PROGRESS.md` records where the build differs.

## What it can change

- **Website text**, anywhere on the pages. Defaults are in `frontend/src/content/registry.js`, and edits
  are rows in the `siteText` table, which override them. The Site text page edits the same rows by hand.
  Setting a text to empty removes it from the page, and the original can be put back.
- **Contact details and links.** The address, emails and phone numbers are website text (`contact.*`). So
  are social media, form and map links (`links.*`), which must be full web addresses. Only the social links
  can be blank, which takes their icon off the footer.
- **Records**: new and changed team members, governors and mentors, startups, news and gallery photos.
  The fields and their checks are the version history's (`convex/lib/registry.ts`), so the CMS forms,
  MCP apps and the assistant all follow the same rules.
- **Pictures**: attach them in the chat. New items can only use an attached picture, which the server
  enforces, because a model left to choose put other people's photos on new people. So a new startup or
  news post asks for one. A new person doesn't need one. Existing records can swap to a library
  picture when asked. No image editing.

The backend bundles `registry.js` to know which texts exist, so one added there can be used once the backend
is redeployed.

It can't change layout, styling or colours, add, remove or reorder sections (it can only empty a text), change
the background video, set a news item's date (approving sets today's), or add new kinds of feature. It says so.

## Setup

Set this on the Convex deployment with `npx convex env set NAME value`:

| Variable | What it is |
| --- | --- |
| `AI_SETTINGS_KEY` | Encrypts provider API keys. `openssl rand -base64 32`. Changing it makes saved keys unreadable. |

The website needs `VITE_CMS_URL` set to the CMS's address, and the CMS needs `VITE_SITE_URL` set to the
website's. The preview won't load without them; the page says so if it doesn't.

Then, in the CMS, open **Settings → AI model config**, add a provider key, and check the model and budget. Saving a key
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

`drafting` → `reviewing` → `sent` (waiting on the Versions page) → approved or rejected there

- **Editing** runs as one scheduled action per model call, so long tasks stay inside Convex's action time
  limit and the spend cap is checked before every call.
- **Review:** a pass sends the draft to the Versions page straight away (`ai/send.ts`). A rejection goes back
  to the editor up to twice, then the admin decides and can "Send anyway" (logged). A review with no verdict
  counts as an objection.
- **Builds on what's waiting:** the agent reads, and the preview shows, the live site with the pending AI draft
  applied, so a follow-up ("make it shorter") works on what was just sent. Records waiting to be added there
  have ids like `new-1` and can be changed too. A follow-up starts a new chat draft; when sent, its changes
  merge into the same pending AI draft, one change per field.
- **Sending** checks the whole draft first: if a record it changes was deleted meanwhile, nothing is sent and
  the admin is told why.
- **Deletes** pause for the admin before they enter the draft.
- **Pictures** in open chat drafts, waiting on the Versions page, or anywhere in the version history are kept by
  the daily cleanup of unused pictures. Attached pictures that end up unused go after a day.
- **Approving** on the Versions page is one Convex transaction. A field the admin edited in the CMS after the
  assistant sent its change keeps the admin's edit, unless they choose the AI value there.
- **Undo** is the Versions page's: undo a version, put back one change, or restore the site to a point.

## The preview

The right pane is the real website in a frame (`?cms-edit=1&cms-agent=1`), the same approach as the Site
text page, so it looks exactly like the public site. **After** shows the site as it will be once approved:
everything waiting on the Versions page plus the chat's draft. **Before** is the live site. `frontend/src/content/AgentBridge.jsx` runs only in
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
asks, so an approval or undo shows at once. A tab left open and untouched keeps what it has until the visitor moves between
pages or comes back to it.

## Prices and model names

`convex/ai/prices.ts` checks every day, when a key is saved, and from **Check prices now** on the settings page.
Each model's price comes from the first of these that applies (`priceSources.ts`):

1. The provider's own price page: Anthropic's and Google's can be read as text. OpenAI's refuses automated requests.
2. LiteLLM and OpenRouter, two independent public price lists, when they agree.
3. Otherwise the higher of the two, marked as unconfirmed, because reading high can only stop the assistant early.

A price page that's far from both lists is treated as misread. An unconfirmed price far from the last known one is held
back and flagged. A source that's down changes nothing, and a model is only removed when every source answered without it
and it isn't in use. Prices the admin enters always win. Names come from the provider where the key can ask, then the lists,
and only plain characters get through. Keys only go to their own provider, to ask which models they can use; that isn't a
model call, so it costs nothing. Past usage keeps the cost worked out at the time.

## Usage and the log

Settings → AI model config splits usage by month, provider, model and job (editing or review), with a total that matches
the meter. The **AI activity** tab on the Versions page lists every request, tool call, review verdict and model call,
filtered by category and model, with what the selection adds up to. It looks at the latest 1,000 entries.

## When the agent asks

It works for AIC IIITK: "our", "we" and "our logo" mean the incubator, and startups are other companies. It asks instead of
guessing when it doesn't know what to change, what it should become, or a new item's required details. The site's own logo is
in the code, so it says it can't change that. Up to 3 pictures can be attached to a message.

## Known limits

- **Busy models and limits:** when a provider is overloaded or a limit is hit, the assistant waits and retries
  up to 4 times (a notice says so), then stops and keeps the draft. Each model call has a 3-minute time limit.
- **Spend:** the meter is an estimate, and updates by itself after every model call. Providers don't tell a normal
  API key its balance, so cost is the tokens they report (thinking tokens included) × the current prices. Cached tokens are counted at the full input
  price and no prompt caching is requested, so the meter errs high and long chats cost more than they could.
- **Website deploy:** the frontend must be deployed with `AgentBridge.jsx` for the preview to work in production.

## Tests

See `convex-backend/tests/ai/README.md`.
