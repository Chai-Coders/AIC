import apiFetch from './client';
import { getCached } from './cache';

// Ask for big pages so a whole list usually arrives in one request. The
// backend caps this (see StandardPagination); anything beyond the first page is
// fetched in parallel rather than one page after another.
const PAGE_SIZE = 100;

async function getJson(path) {
  const res = await apiFetch(path);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Fetches all pages of a paginated DRF list endpoint.
 * DRF pagination shape: { count, next, previous, results: [...] }
 * If the endpoint returns a plain array (non-paginated), returns it directly.
 *
 * @param {string} path - API path, e.g. '/gallery/'
 * @param {Record<string,string>} [params] - Extra query params
 * @returns {Promise<Array>}
 */
async function fetchAllPages(path, params = {}) {
  const query = (page) => new URLSearchParams({ ...params, page: String(page), page_size: String(PAGE_SIZE) });
  const first = await getJson(`${path}?${query(1)}`);

  // Non-paginated response (plain array)
  if (Array.isArray(first)) {
    return first;
  }

  const items = [...(first.results || [])];
  const perPage = items.length;
  if (!first.next || !perPage) return items;

  // The server may use a smaller page size than requested; derive the page count from what it sent.
  const totalPages = Math.ceil((first.count || 0) / perPage);
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) => getJson(`${path}?${query(i + 2)}`))
  );
  rest.forEach((page) => items.push(...(page.results || [])));
  return items;
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
 * Fetch all gallery items.
 * Returns: Array<{ id, image, subtext, created_at }>
 */
export const fetchAllGallery = cached('gallery', () => fetchAllPages('/gallery/'));

/**
 * Fetch all startups.
 * Returns: Array<{ id, name, description, logo_or_image, website_url, created_at }>
 */
export const fetchAllStartups = cached('startups', () => fetchAllPages('/startups/'));

/**
 * Fetch all news updates.
 * Returns: Array<{ id, title, subtitle, content, thumbnail, published_date }>
 */
export const fetchAllNews = cached('news', () => fetchAllPages('/news/'));

// All team members are fetched once and split by category on the client, so the
// Team, Mentors and Board pages share one request and one cache entry.
const fetchAllTeam = cached('team', () => fetchAllPages('/team/'));

const teamFetchers = {};

/**
 * Fetch team members filtered by category.
 * @param {'team'|'mentor'|'governor'} category
 * Returns: Array<{ id, name, role, category, category_display, photo, bio }>
 */
export function fetchTeam(category) {
  if (!teamFetchers[category]) {
    const fn = () => fetchAllTeam().then((members) => members.filter((m) => m.category === category));
    fn.cacheKey = fetchAllTeam.cacheKey;
    fn.select = (members) => members.filter((m) => m.category === category);
    teamFetchers[category] = fn;
  }
  return teamFetchers[category];
}

/**
 * Fetch the homepage background video.
 * Returns: { id, video_name, video_url, thumbnail_url, mux_playback_id, updated_at }
 */
export const fetchBackgroundVideo = cached('background-video', () => getJson('/backgroundvideo/'));

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
