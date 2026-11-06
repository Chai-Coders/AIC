import type { VercelConfig } from '@vercel/config/v1';

// Vercel project settings (instead of vercel.json, so they can read the
// project's environment variables at build time).
//
// With VITE_CONVEX_SITE_URL set to the backend's site address (the one that
// serves /img/<id>), the website's content and pictures are fetched through
// this site and cached by Vercel's CDN near visitors: /content.json for the
// content (refreshed every minute, see convex-backend/convex/http.ts) and
// /media/<id> for pictures (cached for a year; a picture never changes).
const site = (process.env.VITE_CONVEX_SITE_URL ?? '').replace(/\/+$/, '');

export const config: VercelConfig = {
  rewrites: [
    ...(site
      ? [
          { source: '/content.json', destination: `${site}/content` },
          { source: '/media/:id', destination: `${site}/img/:id` },
        ]
      : []),
    // Single-page app: every other path loads the app.
    { source: '/(.*)', destination: '/index.html' },
  ],
  headers: [
    {
      source: '/assets/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
  ],
};
