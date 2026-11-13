# AI Assistant tests

These run the whole flow against a **local** deployment with a scripted fake model
(`fake-services.mjs`). They never call a real provider, and cost nothing. They add rows to the deployment's AI tables and edit
its sample content, so don't point them at a deployment you care about.

```sh
# Terminal 1: backend
cd convex-backend && NODE_OPTIONS=--dns-result-order=ipv4first CONVEX_AGENT_MODE=anonymous npx convex dev --typecheck disable

# Terminal 2: fake model
node convex-backend/tests/ai/fake-services.mjs

# Point the local deployment at them, and make a test admin (once)
cd convex-backend
npx convex env set AI_SETTINGS_KEY "$(openssl rand -base64 32)"
npx convex env set ANTHROPIC_BASE_URL http://127.0.0.1:4599/v1
npx convex env set GOOGLE_BASE_URL http://127.0.0.1:4599/v1beta
node scripts/setup-auth-keys.mjs http://localhost:5175
npx convex run admin:createAdmin '{"email":"test@aic.local","password":"<at least 8 characters>"}'

# Backend checks (needs sample content in the deployment)
TEST_EMAIL=test@aic.local TEST_PASSWORD=... node tests/ai/e2e.mjs [name filter]

# Browser checks: also run the website on :5174 and the CMS on :5175
# (see docs/ai-agent.md), then
npm i --no-save playwright-core
TEST_EMAIL=test@aic.local TEST_PASSWORD=... SHOTS_DIR=/tmp REPO="$(cd ../ && pwd)" node tests/ai/ui.mjs
```

Also set `PRICE_FEED_BASE_URL` to `http://127.0.0.1:4599/feeds`, so the price check reads the fake sources.

Both suites choose their own model and put the admin's back at the end, and both fail if the live site's content differs
from when they started. What the assistant sends goes to the Versions page's pending AI draft; the suites approve or
reject it there and undo what they approved, so the version history keeps their versions. The backend suite stops
if something is already waiting there. They run against the real database, so give them time to finish (the backend suite takes
about 5 minutes): one that's killed partway can't restore anything.

When finished, run `npx convex run testCleanup:run`. It removes the test admin and its chats, log and usage, so fake costs don't stay on
the spend meter. Then run `npx convex run ai/prices:refresh` to read the real prices again.

**Afterwards remove `ANTHROPIC_BASE_URL`, `GOOGLE_BASE_URL` and `PRICE_FEED_BASE_URL`** (`npx convex env
remove NAME`), or the deployment will keep sending your real API key to the fake
server. The Gemini check needs a Google key saved in the deployment.
