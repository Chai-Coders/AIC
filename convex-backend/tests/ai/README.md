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
npx convex run admin:createAdmin '{"email":"test@aic.local","password":"<at least 10 characters>"}'

# Backend checks (needs sample content in the deployment)
TEST_EMAIL=test@aic.local TEST_PASSWORD=... node tests/ai/e2e.mjs [name filter]

# Browser checks: also run the website on :5174 and the CMS on :5175
# (see docs/ai-agent.md), then
npm i --no-save playwright-core
TEST_EMAIL=test@aic.local TEST_PASSWORD=... SHOTS_DIR=/tmp REPO="$(cd ../ && pwd)" node tests/ai/ui.mjs
```

**Afterwards remove `ANTHROPIC_BASE_URL` and `GOOGLE_BASE_URL`** (`npx convex env
remove NAME`), or the deployment will keep sending your real API key to the fake
server. The Gemini check needs a Google key saved in the deployment.
