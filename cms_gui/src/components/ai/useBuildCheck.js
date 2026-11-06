import { useCallback, useEffect, useRef } from 'react';

// How long the bundler may stay quiet before a build counts as settled. Longer
// after a compile has started, because large changes take a while.
const QUIET_MS = 5000;
const COMPILING_MS = 45000;
const AFTER_RESULT_MS = 1500;
// How long to stay on each changed page while it loads and renders.
const PAGE_DWELL_MS = 1800;

// Errors from the network aren't caused by the change being checked.
const isNetworkNoise = (message) => /failed to fetch|networkerror|load failed/i.test(message || '');
// Thrown when a lazy route is opened while a recompile is under way. It settles
// by itself, and a real syntax error is reported by the compile.
const isBundlerRace = (message) => /hasn't been transpiled yet/i.test(message || '');

// The bundler wraps syntax errors in a TypeError of its own when reporting them.
const cleanMessage = (message) =>
  String(message).replace(/^.*Cannot assign to read only property 'message' of object '/, '').replace(/'\s*$/, '');

/**
 * The build check. When a draft enters `building`, this waits for the preview to
 * settle and reports whether it's broken, through `report(revision, error)`.
 * `revision` is the draft's `updatedAt`; the check waits for `previewReady` so a
 * preview that never loaded isn't taken as a pass.
 *
 * The preview compiles each edit as it arrives, usually before the draft reaches
 * `building`, and doesn't compile at all if a retry changed nothing. So the error
 * is tracked all the time and only cleared when a new compile starts. Once it
 * has settled, the check opens each changed page, to catch crashes when rendering.
 */
export function useBuildCheck({ draft, previewReady, navigate, report }) {
  const revision = draft?.status === 'building' ? draft.updatedAt : null;
  const state = useRef({ revision: null, error: null, timer: null });
  const reportRef = useRef(report);
  const navigateRef = useRef(navigate);
  useEffect(() => {
    reportRef.current = report;
    navigateRef.current = navigate;
  });

  const settleAfter = useCallback((ms) => {
    const s = state.current;
    clearTimeout(s.timer);
    if (s.revision === null) return;
    s.timer = setTimeout(() => {
      const pages = s.error ? [] : (s.pages ?? []);
      const finish = () => {
        const done = s.revision;
        if (done === null) return;
        s.revision = null;
        reportRef.current(done, s.error);
      };
      const visit = (index) => {
        if (s.revision === null) return;
        if (index >= pages.length || s.error) return finish();
        navigateRef.current(pages[index]);
        s.timer = setTimeout(() => visit(index + 1), PAGE_DWELL_MS);
        return undefined;
      };
      visit(0);
    }, ms);
  }, []);

  useEffect(() => {
    const s = state.current;
    if (revision === null || !previewReady) {
      s.revision = null;
      clearTimeout(s.timer);
    } else if (s.revision !== revision) {
      s.revision = revision;
      s.pages = [...new Set((draft.changeList ?? []).map((c) => c.page).filter(Boolean))];
      settleAfter(QUIET_MS);
    }
    // `draft` is only read when the revision changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, previewReady, settleAfter]);

  useEffect(() => () => clearTimeout(state.current.timer), []);

  const onError = useCallback(
    (message) => {
      if (!message || isNetworkNoise(message) || isBundlerRace(message)) return;
      state.current.error = cleanMessage(message);
      settleAfter(AFTER_RESULT_MS);
    },
    [settleAfter],
  );

  return {
    onCompiling: useCallback(() => {
      state.current.error = null;
      settleAfter(COMPILING_MS);
    }, [settleAfter]),
    onCompiled: useCallback(() => settleAfter(AFTER_RESULT_MS), [settleAfter]),
    onBuildError: onError,
    onRuntimeError: onError,
  };
}
