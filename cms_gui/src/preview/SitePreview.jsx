import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { loadSandpackClient } from '@codesandbox/sandpack-client';
import { SANDBOX_ENTRY } from './sandbox';

// The public website rendered in the admin's browser by Sandpack, with the
// draft applied (see sandbox.js). The parent controls it through the ref:
//   navigate(path), highlight({ path, selector, text, label }), clearHighlight(), pick(on), marks(items)
// and hears back through the callbacks:
//   onLocation(path), onPicked(element), onPickEnded(), onBuildError(message), onReady(),
//   onCompiling() when the bundler starts on a change, onCompiled() when it ends
//
// This drives the Sandpack client directly rather than through SandpackProvider:
// only the preview is needed, and under React StrictMode the provider loses track
// of its client, which then silently drops every file update and error.

const RECOMPILE_DELAY_MS = 400;
const RELOAD_SETTLE_MS = 5000;

function toSetup(files, dependencies) {
  const pkg = { name: 'aic-preview', main: SANDBOX_ENTRY, dependencies };
  return {
    entry: SANDBOX_ENTRY,
    dependencies,
    files: { ...files, '/package.json': { code: JSON.stringify(pkg) } },
    template: 'create-react-app',
  };
}

const SitePreview = forwardRef(function SitePreview(
  { files, dependencies, onLocation, onPicked, onPickEnded, onBuildError, onCompiling, onCompiled, onReady, onRuntimeError, className = '' },
  ref,
) {
  const frameRef = useRef(null);
  const clientRef = useRef(null);
  const [ready, setReady] = useState(false);
  const callbacks = useRef({});
  useLayoutEffect(() => {
    callbacks.current = { onLocation, onPicked, onPickEnded, onBuildError, onCompiling, onCompiled, onReady, onRuntimeError };
  });
  // Sandpack puts the frame back on "/" when it reloads, so the page and the
  // outlined element are put back when the bridge next says it's ready.
  const lastPath = useRef('/');
  const lastHighlight = useRef(null);
  const lastCompile = useRef(0);
  const lastMarks = useRef([]);
  const picking = useRef(false);
  const latestSetup = useRef(null);
  const sentSetup = useRef(null);

  const post = useCallback((message) => {
    frameRef.current?.contentWindow?.postMessage(message, '*');
  }, []);

  // Start the bundler once, with whatever files exist then. Later changes go
  // through updateSandbox below.
  useEffect(() => {
    let cancelled = false;
    let client = null;
    let unlisten = null;
    latestSetup.current = toSetup(files, dependencies);
    // StrictMode mounts, unmounts and remounts at once in development. Waiting a
    // tick means only the surviving mount ever starts a client on this iframe.
    const start = setTimeout(async () => {
      const loaded = await loadSandpackClient(frameRef.current, latestSetup.current, {
        showOpenInCodeSandbox: false,
        showErrorScreen: true,
        showLoadingScreen: false,
      });
      if (cancelled) {
        loaded.destroy();
        return;
      }
      client = loaded;
      clientRef.current = loaded;
      sentSetup.current = latestSetup.current;
      unlisten = loaded.listen((msg) => {
        const cb = callbacks.current;
        if (msg.type === 'start') {
          lastCompile.current = Date.now();
          cb.onCompiling?.();
        }
        if (msg.type === 'done') {
          // A change that arrived mid-compile was left waiting for this.
          if (latestSetup.current !== sentSetup.current) {
            sentSetup.current = latestSetup.current;
            loaded.updateSandbox(latestSetup.current);
          }
          cb.onCompiled?.();
        }
        if (msg.type === 'action' && msg.action === 'show-error') {
          cb.onBuildError?.([msg.title, msg.message].filter(Boolean).join(': ') || 'The preview failed to build.');
        }
      });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(start);
      unlisten?.();
      client?.destroy();
      clientRef.current = null;
    };
    // Only on mount; changes go through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyed on the contents: a re-render with equal files must not cancel a pending update.
  const setupKey = useMemo(() => JSON.stringify(toSetup(files, dependencies)), [files, dependencies]);
  useEffect(() => {
    const setup = JSON.parse(setupKey);
    if (latestSetup.current && JSON.stringify(latestSetup.current) === setupKey) return undefined;
    latestSetup.current = setup;
    const timer = setTimeout(() => {
      const client = clientRef.current;
      if (client && client.status === 'done') {
        sentSetup.current = setup;
        client.updateSandbox(setup);
      }
    }, RECOMPILE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [setupKey]);

  useEffect(() => {
    const onMessage = (event) => {
      const msg = event.data;
      if (!msg || msg.source !== 'aic-preview') return;
      if (event.source !== frameRef.current?.contentWindow) return;
      const cb = callbacks.current;
      // Right after a compile "/" is just the reload, not the admin going home.
      if (msg.type === 'aic:location' && (msg.path !== '/' || Date.now() - lastCompile.current > RELOAD_SETTLE_MS)) lastPath.current = msg.path;
      if (msg.type === 'aic:location') cb.onLocation?.(msg.path);
      if (msg.type === 'aic:picked') cb.onPicked?.(msg.element);
      if (msg.type === 'aic:pickEnded') {
        picking.current = false;
        cb.onPickEnded?.();
      }
      if (msg.type === 'aic:ready') {
        setReady(true);
        if (lastHighlight.current) post({ type: 'aic:highlight', ...lastHighlight.current });
        else if (lastPath.current !== '/') post({ type: 'aic:navigate', path: lastPath.current });
        post({ type: 'aic:marks', items: lastMarks.current });
        if (picking.current) post({ type: 'aic:pick', on: true });
        cb.onReady?.();
      }
      if (msg.type === 'aic:error') cb.onRuntimeError?.(msg.message);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [post]);

  useImperativeHandle(
    ref,
    () => ({
      navigate: (path) => {
        lastPath.current = path;
        lastHighlight.current = null;
        post({ type: 'aic:navigate', path });
      },
      highlight: (target) => {
        lastHighlight.current = target;
        post({ type: 'aic:highlight', ...target });
      },
      clearHighlight: () => {
        lastHighlight.current = null;
        post({ type: 'aic:clearHighlight' });
      },
      pick: (on) => {
        picking.current = on;
        post({ type: 'aic:pick', on });
      },
      marks: (items) => {
        lastMarks.current = items;
        post({ type: 'aic:marks', items });
      },
    }),
    [post],
  );

  return (
    <div className={`aic-site-preview relative h-full w-full ${className}`}>
      <iframe ref={frameRef} title="Website preview" className="block h-full w-full border-0 bg-white" allow="clipboard-write" />
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          Loading the website preview…
        </div>
      )}
    </div>
  );
});

export default SitePreview;
