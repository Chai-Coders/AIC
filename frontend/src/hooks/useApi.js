import { useState, useEffect } from 'react';
import { readCache } from '../api/cache';

/**
 * Generic data-fetching hook with stale-while-revalidate caching.
 *
 * If the fetcher has a `cacheKey` (all helpers in src/api/content.js do), the
 * last known data renders immediately and is refreshed in the background, so
 * repeat visits and page switches don't show a spinner.
 *
 * @param {() => Promise<any>} fetcher - An async function from src/api/content.js
 * @param {any} [emptyValue=[]] - Value used before any data is available
 * @returns {{ data: any, loading: boolean, error: string|null }}
 *
 * @example
 *   const { data: gallery, loading, error } = useApi(fetchAllGallery);
 */
function useApi(fetcher, emptyValue = []) {
  const [state, setState] = useState(() => {
    const entry = fetcher.cacheKey ? readCache(fetcher.cacheKey) : null;
    if (entry) {
      const select = fetcher.select || ((d) => d);
      return { data: select(entry.data), loading: false, error: null };
    }
    return { data: emptyValue, loading: true, error: null };
  });

  useEffect(() => {
    let cancelled = false;

    fetcher()
      .then((result) => {
        if (!cancelled) setState({ data: result, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        // Keep showing cached data if the refresh fails; only surface the error otherwise.
        setState((prev) =>
          prev.loading ? { ...prev, loading: false, error: err.message || 'Failed to load data.' } : prev
        );
      });

    // Cleanup — ignore stale responses if component unmounts
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

export default useApi;
