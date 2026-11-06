import { useCallback, useState } from 'react';

/** A pane size remembered in this browser. */
export function useStoredSize(key, fallback) {
  const [size, setSize] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(key));
      return saved > 0 ? saved : fallback;
    } catch {
      return fallback;
    }
  });
  const update = useCallback(
    (next) => {
      setSize(next);
      try {
        localStorage.setItem(key, String(next));
      } catch {
        // Storage unavailable: the size just won't survive a reload.
      }
    },
    [key],
  );
  return [size, update];
}
