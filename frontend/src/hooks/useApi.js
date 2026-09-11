import { useState, useEffect } from 'react';

/**
 * Generic data-fetching hook.
 *
 * @param {() => Promise<Array>} fetcher - An async function (from src/api/content.js)
 * @returns {{ data: Array, loading: boolean, error: string|null }}
 *
 * @example
 *   const { data: gallery, loading, error } = useApi(fetchAllGallery);
 */
function useApi(fetcher) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load data.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    // Cleanup — ignore stale responses if component unmounts
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error };
}

export default useApi;
