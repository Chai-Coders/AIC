# CMS GUI + Backend — Fix Report

Date: 2026-10-03 · Scope: `cms_gui/` and `backend/` · Nothing committed yet (working tree changes only)

## 1. Action required before deploying

1. **Rotate the Mux API token.** `backend/content/mux_service.py` had a real `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET` hard-coded as defaults. It is removed from the code now, but it is still in git history, so treat it as leaked. Rotate it in the Mux dashboard.
2. **Set `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET` on the Render backend.** The code no longer falls back to the leaked key. If these variables are missing, video upload returns a clear `503` instead of working.
3. If you build the Docker image, gunicorn now runs with `--timeout 360`, so long video uploads aren't killed after 30 seconds.

## 2. How it was verified

| Check | Before | After |
|---|---|---|
| Backend tests (`manage.py test`) | 20 pass | **27 pass** (7 new) |
| `eslint .` in cms_gui | **38 errors** | 0 |
| `vite build` | ok | ok |
| Browser E2E (headless Chromium + playwright-core, real Django + Vite dev server, seeded data) | – | **21 / 21 pass**, run several times |

The E2E run covered: login (bad and good credentials), pagination (25 records), editing, keyboard access, the sticky edit panel, bulk delete, multi-select reset on route change, the team filter, the background-video page, silent token refresh over two rotation cycles, expired-session redirect, mobile sidebar behaviour, delete buttons on touch screens, no horizontal overflow on mobile, the theme toggle, and no unexpected console errors.

The Chrome DevTools / Claude-in-Chrome browser tools weren't connected in this session, so the browser tests ran on the local `/usr/bin/chromium`. The test script and database are in the session scratchpad, not the repo.

## 3. cms_gui — logic bugs fixed

| # | Problem | Impact | Fix |
|---|---|---|---|
| 1 | `API_BASE` defaulted to `''`, so requests went to `/gallery/` and `/auth/login/` instead of `/api/...` (regression from commit 35453bd) | Vite answered with `index.html` (HTTP 200). The JSON parse failed silently, so **login did nothing and every list was empty** unless `VITE_API_BASE` was set | Default is now `/api` (`services/api.js`) |
| 2 | Token refresh kept the **old** refresh token, but the backend rotates and blacklists it | The second refresh always failed, logging the admin out after about 2 hours | Store `data.refresh` from the refresh response |
| 3 | Parallel 401s each started their own refresh | With rotation, all but the first refresh failed and logged the user out | One shared in-flight refresh promise |
| 4 | On a 401 the tokens were cleared but React auth state wasn't | The UI looked logged in, but every request failed | Dispatches a `cms:session-expired` event; `AuthContext` logs out and redirects to login |
| 5 | Lists only read page 1 of DRF pagination (`PAGE_SIZE=20`) | **Records after the 20th were invisible** in the CMS and the record count was wrong | `listAll()` walks every page |
| 6 | Startup session check cleared tokens on *any* error | A network blip or 5xx logged the admin out | Only clears on 401/403 |
| 7 | `logout()` threw if the request failed, so state was never reset | The user stayed "logged in" with no tokens | `try/finally` in both `api` and `AuthContext`. The backend logout no longer needs a valid access token |
| 8 | Bulk delete removed **all** selected items from the UI, even those whose DELETE failed | The UI showed records as deleted that still existed | `Promise.allSettled`; only successful deletes are removed, failed ones stay selected |
| 9 | Fetch had no protection against out-of-order responses | Switching the team filter quickly could show the wrong category | Responses from superseded requests are ignored |
| 10 | Multi-select state was global across pages | Turning it on in Gallery carried over to News, Team, etc. | Multi-select is stored per path |
| 11 | `setMultiSelect` updater ran other `setState` calls (side effects inside an updater) | Double-invoked under StrictMode | Moved to render-time state sync |
| 12 | Background video: when no video exists the API returns the placeholder name `"No Background Video Active"`, and the page put it into the name input | Uploads were named "No Background Video Active" | Only prefill when `id` exists |
| 13 | Clipboard copy ignored promise rejection | Showed "copied" even when it failed (http / permission) | Awaited, with an error toast |

## 4. cms_gui — UI / UX fixes

- **Sticky edit panel never stuck.** `<main>` had `overflow-y-auto`, which made it the scroll container, so `lg:sticky` didn't work. Removed it; the panel now stays in view while scrolling.
- **`animate-in`, `fade-in`, `zoom-in-95`, `slide-in-*` did nothing.** They were used in 7 places but no plugin provided them. Added `tw-animate-css`.
- **`dark:` variants followed the OS theme, not the in-app toggle.** Tailwind v4 defaults to the media query. Added `@custom-variant dark` tied to the `.dark` class.
- **"Click or drag image to upload" had no drag-and-drop.** Implemented drop, drag highlight and keyboard activation.
- Image uploads are now validated client-side for type and the 10 MB limit the UI advertises. Video uploads are validated for type and the 500 MB limit.
- Edit mode: the image "✕" button cleared the preview but the backend kept the image, which was misleading. It now **reverts** to the saved image, and a **Replace** button was added.
- Gallery/team grid used viewport breakpoints, so with the sidebar and edit panel open, titles were cut to "Gallery…". It now uses a container-aware `auto-fill` grid.
- Gallery cards showed the same date twice. Removed the duplicate.
- Mobile: the sidebar opened on load and covered the page, and didn't close after choosing a page. It now starts closed, closes on navigation and on Escape, and has no 1px border left behind when collapsed.
- Delete buttons only appeared on hover, so they were **unreachable on touch screens and by keyboard**. They're now always visible on touch (`pointer-coarse`) and show on hover or focus with a mouse.
- Cards are now keyboard-accessible (`role="button"`, Enter/Space, focus ring, `aria-pressed`, labels).
- Form labels are linked to their inputs (`htmlFor`/`id`), and icon-only buttons have `aria-label`s.
- The delete modal focuses **Cancel** when it opens and returns focus when it closes. Broken thumbnails are hidden.
- Toasts: `aria-live`, a distinct warning (amber) style, stacking capped at 4, and full width on mobile.
- Background video page: the "live" pulse only shows when a video actually exists, there's a local `<video>` preview of the selected file, the button that used to say "Change" but actually removed the file is now separate **Change** and **Remove** buttons, and a note shows during long uploads.
- `select-none` removed from form containers (it can block typing in inputs on Safari).
- Page title changed from "CMS Studio • Claude Theme" to "AIC CMS Studio".
- Lint: removed unused imports and variables, `ROUTES` moved to `src/routes.js` (fixes fast-refresh), and the Node globals the ESLint config needs for `vite.config.js`.

## 5. Backend fixes

| File | Fix |
|---|---|
| `content/mux_service.py` | Removed the hard-coded Mux credentials (raises `MuxConfigurationError` if unset). **Removed the "latest asset in the account" fallback**: it could adopt an unrelated Mux asset as the background video and later delete it. Detects errored or cancelled uploads and assets. Upload timeout raised to 300 s, asset polling to 30 s |
| `content/views.py` | `BackgroundVideoView.post`: rejects non-video files (400), returns 503 when Mux isn't configured, and **deletes the previous Mux asset only after the new one is saved** (before, a failed save left the site with no video) |
| `content/auth_views.py` | `LogoutView` no longer needs a valid access token. The refresh token being revoked is the credential, so logout works after the access token expires |
| `content/admin.py` | `BackgroundVideo` registered in Django admin |
| `cms_backend/settings.py` | `ssl_require` for `DATABASE_URL` can now be set with `DB_SSL_REQUIRE` (default `True`), so local Postgres URLs work |
| `docker-compose.yml` | CORS now allows the cms_gui dev origins (5173/5174); Mux env vars passed through |
| `Dockerfile` | gunicorn `--timeout 360` for video uploads |
| `content/tests.py` | 7 new tests: logout without an access token, refresh rotation, background-video GET placeholder, upload auth, non-video rejection, 503 without Mux, replace-then-delete ordering |

## 6. Reviewed and intentionally left alone

- `perform_update` bumping `created_at` / `published_date` on edit: intentional per commit `5eee183` ("time update for editing items"), so edited items move to the top.
- Old image files are not deleted from storage when a record is edited or deleted. This is a storage leak, but deleting media is destructive and seed data may share files, so it's a recommendation rather than a change.
- `AddItemCard.jsx`, `NewsDetailPane.jsx` and `App.css` are unused (only lint cleanup was done). They can be deleted if not planned.
- `DEBUG` defaults to `True` and `SECRET_KEY` has an insecure fallback. Make sure Render sets `DEBUG=False` and a real `SECRET_KEY`.

## 7. Files changed

Backend (8): `Dockerfile`, `docker-compose.yml`, `cms_backend/settings.py`, `content/{admin,auth_views,mux_service,tests,views}.py`
cms_gui (27): `eslint.config.js`, `index.html`, `package.json` (+ lock: `tw-animate-css`), `src/index.css`, `src/routes.js` (new), `src/services/api.js`, `src/context/*`, `src/layouts/DashboardLayout.jsx`, `src/components/*`, `src/pages/*`
