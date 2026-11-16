# AIC IIIT Kottayam website

The public website of the Atal Incubation Centre at IIIT Kottayam, the CMS its staff use to
keep it up to date, and the backend both run on.

| Folder | What it is | Built with |
|---|---|---|
| `frontend/` | The public website: home, about, programmes (SIA, SISFS, acceleration), portfolio, news, gallery, careers | React, Vite |
| `cms_gui/` | The CMS ("Website Manager") where admins edit the website | React, Vite, Tailwind |
| `convex-backend/` | Database, file storage, sign-in and server code for both | [Convex](https://convex.dev) |

## What it does

**The website** shows the centre's programmes, its startup portfolio, team, mentors and board,
news, a photo gallery and open positions. Every text on it (headings, paragraphs, buttons, menus,
contact details) has a default in `frontend/src/content/registry.js` that the CMS can override. Startups,
news, team members and gallery photos come from the backend. Pages render straight away from a
copy of the content cached in the browser and baked in at build time, then refresh from the backend.

**The CMS** lets admins, with no coding:

- add, edit and delete startups, news, team members (team, mentors, governors) and gallery photos
- edit any text on the website next to a live preview (**Site text**), then publish it
- upload the homepage background video (stored on Mux)
- see every change ever made on the **Versions** page, and undo a change, put back one field, or
  restore the whole website to an earlier point
- ask the built-in **AI Assistant** to make changes in plain words, or connect an outside AI app
  (Claude, ChatGPT, Cursor, ...) over MCP. AI changes are only proposals: they wait on the Versions
  page and nothing goes live until an admin approves them.

Edits made by hand go live at once, and visitors see them within a minute or two.

**The backend** stores the content and pictures (as resized WebP copies), handles CMS sign-in
(email and password, no public sign-up), records the version history, and serves the MCP server
and the AI Assistant.

## Setting it up locally

You need **Node.js 20.19+ or 22.12+** and npm. No Convex account or Docker is needed: the Convex
CLI downloads and runs a local backend.

### 1. Install

```sh
git clone https://github.com/Chai-Coders/AIC.git
cd AIC
(cd convex-backend && npm install)
(cd frontend && npm install)
(cd cms_gui && npm install)
```

### 2. Start the backend

```sh
cd convex-backend
npx convex dev            # first time: choose "local deployment"
```

Leave it running; it redeploys whenever you save a file in `convex-backend/convex/`. It writes the
backend's two addresses to `convex-backend/.env.local`:

- `CONVEX_URL`, the API (for example `http://127.0.0.1:3210`)
- `CONVEX_SITE_URL`, pictures, sign-in and MCP (for example `http://127.0.0.1:3211`)

### 3. Set up sign-in and create an admin (once)

In a second terminal:

```sh
cd convex-backend
node scripts/setup-auth-keys.mjs http://localhost:5175
npx convex run admin:createAdmin '{"email":"you@example.com","password":"at-least-8-chars","name":"Your Name"}'
```

The address is where the CMS runs (step 4). There is no sign-up page; this is how admins are made.
To change a password later: `npx convex run admin:setPassword '{"email":"…","password":"…"}'`.

### 4. Start the website and the CMS

Copy each app's `.env.example` to `.env.local` and set the addresses:

```sh
# frontend/.env.local
VITE_CONVEX_URL=http://127.0.0.1:3210     # CONVEX_URL from step 2
VITE_CMS_URL=http://localhost:5175

# cms_gui/.env.local
VITE_CONVEX_URL=http://127.0.0.1:3210     # CONVEX_URL from step 2
VITE_SITE_URL=http://localhost:5174
```

Then, in two more terminals:

```sh
cd frontend && npm run dev -- --port 5174 --strictPort
cd cms_gui  && npm run dev -- --port 5175 --strictPort
```

| Open | For |
|---|---|
| http://localhost:5174 | the website |
| http://localhost:5175 | the CMS (sign in with the admin from step 3) |

A fresh local backend has no startups, news, team or photos, so those lists start empty. Add some
in the CMS, or import the real content (see `convex-backend/README.md`, "Importing from Django").

### 5. Optional: the AI Assistant

```sh
cd convex-backend
npx convex env set AI_SETTINGS_KEY "$(openssl rand -base64 32)"
```

Then in the CMS open **Settings → AI Assistant** and add a provider API key. See `docs/ai-agent.md`.
The homepage video upload needs a Mux token (`MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`).

## Everyday commands

| Where | Command | Does |
|---|---|---|
| `frontend/` | `npm run build` | Production build (saves a content snapshot first, `scripts/snapshot.mjs`) |
| `frontend/` | `npm run lint` | Lint with oxlint |
| `cms_gui/` | `npm run build` / `npm run lint` | Production build / lint with ESLint |
| `convex-backend/` | `npm run typecheck` | Type-check the backend without deploying |
| `convex-backend/` | `npm run deploy` | Deploy the backend |

## Making common changes

- **Add or change a default website text:** edit `frontend/src/content/registry.js`. Text keys are
  permanent: renaming one loses any edit published for it in the CMS. The backend reads this file
  too, so redeploy it after adding a text.
- **Add a page:** add the page in `frontend/src/pages/`, its route in `frontend/src/App.jsx`, and its
  texts as a page in `PAGES` in `registry.js`. The CMS's Site text editor picks it up from there.
- **Add an editable field to startups, news, team or gallery:** `convex-backend/convex/schema.ts`
  and `convex-backend/convex/lib/registry.ts`. The CMS forms, version history and AI tools all read
  the registry.

## Deploying

- **Website and CMS:** Vercel. The website's settings are in `frontend/vercel.ts` (CDN caching for
  content and pictures), the CMS's in `cms_gui/vercel.json`.
- **Backend:** self-hosted with Docker (`convex-backend/docker-compose.yml`) or on Convex Cloud.

Step-by-step instructions, the production build variables and the backend's settings are in
`convex-backend/README.md`.

## More documentation

| File | About |
|---|---|
| `convex-backend/README.md` | Backend files, self-hosting, Convex Cloud, caching, version history, MCP, admins, data import |
| `docs/ai-agent.md` | How the AI Assistant works and how to set it up |
| `convex-backend/tests/ai/README.md` | Running the AI Assistant tests against a local backend |
