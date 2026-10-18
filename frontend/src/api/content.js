import apiFetch from './client';
import { getCached } from './cache';

async function getJson(path) {
  const res = await apiFetch(path);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
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
 * Everything the public site shows, in one cached request (/api/site-content/).
 * Every list below reads from this, so loading any page loads them all and
 * switching pages never waits on the network.
 * Returns: { gallery, startups, news, team, background_video }
 */
export const fetchSiteContent = cached('site', () => getJson('/site-content/'));

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
 * @param {'team'|'mentor'|'governor'} category
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
 * Returns: { id, title, subtitle, content, thumbnail, published_date }
 */
export function fetchNewsItem(id) {
  if (!newsItemFetchers[id]) {
    newsItemFetchers[id] = cached(`news:${id}`, () => getJson(`/news/${encodeURIComponent(id)}/`));
  }
  return newsItemFetchers[id];
}
