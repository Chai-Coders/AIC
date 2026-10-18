import { getCached } from './cache';

// Content comes from the Convex backend's public queries (convex-backend/
// convex/content.ts), called over plain HTTP: a read-only site needs no
// WebSocket or Convex client. Responses keep the shape the Django API had.
const CONVEX_URL = (import.meta.env.VITE_CONVEX_URL || '').replace(/\/+$/, '');

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

/**
 * Everything the public site shows, in one cached request (content:siteContent).
 * Every list below reads from this, so loading any page loads them all and
 * switching pages never waits on the network.
 * Returns: { gallery, startups, news, team, background_video }
 */
export const fetchSiteContent = cached('site', () => convexQuery('content:siteContent'));

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
