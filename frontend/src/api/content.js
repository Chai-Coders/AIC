import apiFetch from './client';

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
  const qs = new URLSearchParams({ page: '1', ...params }).toString();
  const firstRes = await apiFetch(`${path}?${qs}`);

  if (!firstRes.ok) {
    throw new Error(`API error ${firstRes.status}: ${firstRes.statusText}`);
  }

  const firstData = await firstRes.json();

  // Non-paginated response (plain array)
  if (Array.isArray(firstData)) {
    return firstData;
  }

  const items = [...firstData.results];

  // Walk through remaining pages using the `next` URL field DRF provides
  let nextUrl = firstData.next; // e.g. "http://127.0.0.1:8000/api/gallery/?page=2"
  while (nextUrl) {
    // Extract just the path + query from the absolute next URL
    const url = new URL(nextUrl);
    const relPath = url.pathname + url.search; // e.g. "/api/gallery/?page=2"
    // Strip the /api prefix since apiFetch prepends the full base URL
    const apiPrefix = '/api';
    const cleanPath = relPath.startsWith(apiPrefix)
      ? relPath.slice(apiPrefix.length)
      : relPath;

    const res = await apiFetch(cleanPath);
    if (!res.ok) break;

    const data = await res.json();
    if (!data.results || data.results.length === 0) break;
    items.push(...data.results);
    nextUrl = data.next;
  }

  return items;
}

// ---------------------------------------------------------------------------
// Public API helpers
// ---------------------------------------------------------------------------

/**
 * Fetch all gallery items.
 * Returns: Array<{ id, image, subtext, created_at }>
 */
export const fetchAllGallery = () => fetchAllPages('/gallery/');

/**
 * Fetch all startups.
 * Returns: Array<{ id, name, description, logo_or_image, website_url, created_at }>
 */
export const fetchAllStartups = () => fetchAllPages('/startups/');

/**
 * Fetch all news updates.
 * Returns: Array<{ id, title, subtitle, content, thumbnail, published_date }>
 */
export const fetchAllNews = () => fetchAllPages('/news/');

/**
 * Fetch team members filtered by category.
 * @param {'team'|'mentor'|'governor'} category
 * Returns: Array<{ id, name, role, category, category_display, photo, bio }>
 */
export const fetchTeam = (category) => fetchAllPages('/team/', { category });
