// Stale-while-revalidate cache for public content.
//
// - Results are kept in memory and in localStorage, so navigating between pages
//   and returning visitors render instantly from the last known data.
// - Data fetched by this page load less than FRESH_MS ago is used without touching
//   the network, so moving between pages stays instant. Anything else (including all
//   of localStorage) is shown immediately while a background refresh runs, so a
//   reload always picks up what was just published or rolled back.
// - Concurrent requests for the same key share one network call.
// - A snapshot taken at build time (scripts/snapshot.mjs) is the last resort, so
//   first-time visitors see content before the API has answered.

// v2: content moved from the Django API to Convex (new ids and image URLs).
const STORAGE_PREFIX = 'aic-cache:v2:';
const FRESH_MS = 60 * 1000;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const memory = new Map(); // key -> { data, time }
const inflight = new Map(); // key -> Promise
const fetchedAt = new Map(); // key -> when this page load last fetched it

// Optional: the file only exists when the build could reach the API.
const snapshot = Object.values(
  import.meta.glob('../data/snapshot.json', { eager: true, import: 'default' })
)[0] || {};

// Drop everything cached by the Django version of the site.
try {
  Object.keys(localStorage)
    .filter((key) => key.startsWith('aic-cache:v1:'))
    .forEach((key) => localStorage.removeItem(key));
} catch {
  // Storage unavailable.
}

function readStorage(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || typeof entry.time !== 'number' || Date.now() - entry.time > MAX_AGE_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

function writeStorage(key, entry) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable (private mode); the memory cache still works.
  }
}

/** Last known data for `key`, or null. */
export function readCache(key) {
  let entry = memory.get(key);
  if (!entry) {
    entry = readStorage(key);
    const built = snapshot[key];
    if (built && (!entry || built.time > entry.time)) entry = built;
    if (entry) memory.set(key, entry);
  }
  return entry || null;
}

/** The next read goes to the network: the visitor came back, and things may have changed. */
export function markStale() {
  fetchedAt.clear();
}

/** Fetch `key` with `fetcher`, sharing in-flight requests and storing the result. */
export function fetchAndCache(key, fetcher) {
  if (inflight.has(key)) return inflight.get(key);
  const promise = fetcher()
    .then((data) => {
      const entry = { data, time: Date.now() };
      memory.set(key, entry);
      fetchedAt.set(key, entry.time);
      writeStorage(key, entry);
      return data;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

/** Returns cached data when fresh, otherwise fetches. */
export function getCached(key, fetcher) {
  const entry = readCache(key);
  if (entry && Date.now() - (fetchedAt.get(key) ?? 0) < FRESH_MS) return Promise.resolve(entry.data);
  return fetchAndCache(key, fetcher);
}
