import { useState, useEffect, useCallback } from 'react';
import { markStale, readCache } from '../api/cache';
import { getPreviewContent, onPreviewContent } from '../api/content';

/**
 * Generic data-fetching hook with stale-while-revalidate caching.
 *
 * If the fetcher has a `cacheKey` (all helpers in src/api/content.js do), the
 * last known data renders immediately and is refreshed in the background, so
 * repeat visits and page switches don't show a spinner.
 *
 * @param {() => Promise<any>} fetcher - An async function from src/api/content.js
 * @param {any} [emptyValue=[]] - Value used before any data is available
 * @returns {{ data: any, loading: boolean, error: string|null, retry: () => void }}
 *
 * @example
 *   const { data: gallery, loading, error } = useApi(fetchAllGallery);
 */
function useApi(fetcher, emptyValue = []) {
  const [state, setState] = useState(() => {
    const preview = fetcher.select && getPreviewContent();
    if (preview) return { data: fetcher.select(preview), loading: false, error: null };
    const entry = fetcher.cacheKey ? readCache(fetcher.cacheKey) : null;
    if (entry) {
      const select = fetcher.select || ((d) => d);
      return { data: select(entry.data), loading: false, error: null };
    }
    return { data: emptyValue, loading: true, error: null };
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetcher()
      .then((result) => {
        if (cancelled) return;
        // A refresh that found nothing new shouldn't redraw the page.
        setState((prev) =>
          !prev.loading && !prev.error && JSON.stringify(prev.data) === JSON.stringify(result)
            ? prev
            : { data: result, loading: false, error: null }
        );
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
  }, [attempt]);

  // A new draft from the CMS preview: read it again.
  useEffect(() => onPreviewContent(() => setAttempt((n) => n + 1)), []);

  // Back on this tab, perhaps after publishing or rolling back in the CMS: look again.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      markStale();
      setAttempt((n) => n + 1);
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const retry = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, retry };
}

export default useApi;
