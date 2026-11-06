import { getCached } from './cache';

// Content comes from the Convex backend's public queries (convex-backend/
// convex/content.ts), called over plain HTTP: a read-only site needs no
// WebSocket or Convex client. Responses keep the shape the Django API had.
const CONVEX_URL = (import.meta.env.VITE_CONVEX_URL || '').replace(/\/+$/, '');
// Set when the site is hosted with the CDN rewrites in vercel.ts: content and
// pictures are then loaded from this site's own address (/content.json,
// /media/<id>) and cached near visitors instead of fetched from the backend.
const CONVEX_SITE_URL = (import.meta.env.VITE_CONVEX_SITE_URL || '').replace(/\/+$/, '');
const VIA_CDN = Boolean(CONVEX_SITE_URL) && !import.meta.env.DEV;

async function convexQuery(path, args = {}) {
  const res = await fetch(`${CONVEX_URL}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args, format: 'json' }),
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  const body = await res.json();
  if (body.status !== 'success') {
    throw new Error(body.errorMessage || 'API error');
  }
  return body.value;
}

// ---------------------------------------------------------------------------
// Public API helpers. Each one has a cache key (`.cacheKey`) so useApi can render
// the last known data instantly and refresh it in the background.
// ---------------------------------------------------------------------------

function cached(key, fetcher) {
  const fn = () => getCached(key, fetcher);
  fn.cacheKey = key;
  return fn;
}

/** Picture addresses on the backend (<site>/img/<id>) as this site's /media/<id>. */
function viaCdn(value) {
  if (typeof value === 'string') {
    return value.startsWith(`${CONVEX_SITE_URL}/img/`) ? `/media/${value.slice(CONVEX_SITE_URL.length + 5)}` : value;
  }
  if (Array.isArray(value)) return value.map(viaCdn);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, viaCdn(v)]));
  return value;
}

async function loadSiteContent() {
  if (!VIA_CDN) return convexQuery('content:siteContent');
  const res = await fetch('/content.json');
  if (!res.ok) return convexQuery('content:siteContent');
  return viaCdn(await res.json());
}

/**
 * Everything the public site shows, in one cached request (content:siteContent).
 * Every list below reads from this, so loading any page loads them all and
 * switching pages never waits on the network.
 * Returns: { gallery, startups, news, team, background_video }
 */
export const fetchSiteContent = cached('site', loadSiteContent);

function fromSite(select) {
  const fn = () => fetchSiteContent().then(select);
  fn.cacheKey = fetchSiteContent.cacheKey;
  fn.select = select;
  return fn;
}

/**
 * Fetch all gallery items.
 * Returns: Array<{ id, image, subtext, created_at }>
 */
export const fetchAllGallery = fromSite((site) => site.gallery);

/**
 * Fetch all startups.
 * Returns: Array<{ id, name, description, logo_or_image, website_url, created_at }>
 */
export const fetchAllStartups = fromSite((site) => site.startups);

/**
 * Fetch all news updates.
 * Returns: Array<{ id, title, subtitle, content, thumbnail, published_date }>
 */
export const fetchAllNews = fromSite((site) => site.news);

const teamFetchers = {};

/**
 * Fetch team members filtered by category.
 * @param {'team'|'governor'|'mentor_intl_industry'|'mentor_intl_academic'|'mentor_india_industry'|'mentor_india_academic'} category
 * Returns: Array<{ id, name, role, category, category_display, photo, bio }>
 */
export function fetchTeam(category) {
  if (!teamFetchers[category]) {
    teamFetchers[category] = fromSite((site) => site.team.filter((m) => m.category === category));
  }
  return teamFetchers[category];
}

/**
 * Fetch the homepage background video, or null when none is set.
 * Returns: { id, video_name, video_url, thumbnail_url, mux_playback_id, updated_at } | null
 */
export const fetchBackgroundVideo = fromSite((site) => site.background_video);

/**
 * Website text published from the CMS, by key (see src/content/Text.jsx).
 * Returns: { [key]: string }
 */
export const fetchSiteText = fromSite((site) => Object.fromEntries((site.text ?? []).map((t) => [t.key, t.value])));

const newsItemFetchers = {};

/**
 * Fetch a single news update by id.
 * Returns: { id, title, subtitle, content, thumbnail, published_date } | null
 */
export function fetchNewsItem(id) {
  if (!newsItemFetchers[id]) {
    newsItemFetchers[id] = cached(`news:${id}`, () => convexQuery('content:newsItem', { id: String(id) }));
  }
  return newsItemFetchers[id];
}
