import apiFetch from './client';
import { getCached } from './cache';

class ApiError extends Error {
  constructor(res) {
    super(`API error ${res.status}: ${res.statusText}`);
    this.status = res.status;
  }
}

async function getJson(path) {
  const res = await apiFetch(path);
  if (!res.ok) {
    throw new ApiError(res);
  }
  return res.json();
}

// Follows DRF pagination (`next`) and returns every item of a list endpoint.
async function getAll(path) {
  const items = [];
  let next = path;
  while (next) {
    const data = await getJson(next);
    if (Array.isArray(data)) return data;
    items.push(...data.results);
    next = data.next ? `${path}${new URL(data.next).search}` : null;
  }
  return items;
}

// Builds the /site-content/ payload from the per-resource endpoints, for a
// backend deployed before /site-content/ existed.
async function getSiteContentPerResource() {
  const [gallery, startups, news, team, video] = await Promise.all([
    getAll('/gallery/'),
    getAll('/startups/'),
    getAll('/news/'),
    getAll('/team/'),
    getJson('/background-video/'),
  ]);
  return { gallery, startups, news, team, background_video: video?.id ? video : null };
}

async function getSiteContent() {
  try {
    return await getJson('/site-content/');
  } catch (err) {
    if (err.status !== 404) throw err;
    return getSiteContentPerResource();
  }
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
 * switching pages never waits on the network. Falls back to the per-resource
 * endpoints when the backend has no /site-content/.
 * Returns: { gallery, startups, news, team, background_video }
 */
export const fetchSiteContent = cached('site', getSiteContent);

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
