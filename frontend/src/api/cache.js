// Stale-while-revalidate cache for public content.
//
// - Results are kept in memory and in localStorage, so navigating between pages
//   and returning visitors render instantly from the last known data.
// - Cached data younger than FRESH_MS is used without touching the network;
//   older data is shown immediately while a background refresh runs.
// - Concurrent requests for the same key share one network call.
// - A snapshot taken at build time (scripts/snapshot.mjs) is the last resort, so
//   first-time visitors see content before the API has answered.

const STORAGE_PREFIX = 'aic-cache:v1:';
const FRESH_MS = 60 * 1000;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const memory = new Map(); // key -> { data, time }
const inflight = new Map(); // key -> Promise

// Optional: the file only exists when the build could reach the API.
const snapshot = Object.values(
  import.meta.glob('../data/snapshot.json', { eager: true, import: 'default' })
)[0] || {};

// Lists used to be cached one per key; they now all come from the 'site' entry.
try {
  ['gallery', 'startups', 'news', 'team', 'background-video'].forEach((key) =>
    localStorage.removeItem(STORAGE_PREFIX + key)
  );
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

export function isFresh(entry) {
  return !!entry && Date.now() - entry.time < FRESH_MS;
}

/** Fetch `key` with `fetcher`, sharing in-flight requests and storing the result. */
export function fetchAndCache(key, fetcher) {
  if (inflight.has(key)) return inflight.get(key);
  const promise = fetcher()
    .then((data) => {
      const entry = { data, time: Date.now() };
      memory.set(key, entry);
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
  if (isFresh(entry)) return Promise.resolve(entry.data);
  return fetchAndCache(key, fetcher);
}
