import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { SandpackProvider, SandpackPreview, useSandpack } from '@codesandbox/sandpack-react';
import { SANDBOX_ENTRY } from './sandbox';

// The public website rendered in the admin's browser by Sandpack, with the
// draft applied (see sandbox.js). The parent controls it through the ref:
//   navigate(path), highlight({ path, selector, text, label }), clearHighlight(), pick(on)
// and hears back through the callbacks:
//   onLocation(path), onPicked(element), onBuildError(message | null), onReady()

function postToFrame(container, message) {
  const frame = container?.querySelector('iframe');
  frame?.contentWindow?.postMessage(message, '*');
}

/** Watches Sandpack for compile/runtime errors (used by the build check). */
function ErrorWatcher({ onBuildError }) {
  const { sandpack, listen } = useSandpack();
  const report = useRef(onBuildError);
  useLayoutEffect(() => {
    report.current = onBuildError;
  });

  useEffect(() => {
    report.current?.(sandpack.error ? sandpack.error.message : null);
  }, [sandpack.error]);

  useEffect(
    () =>
      listen((msg) => {
        if (msg.type === 'action' && msg.action === 'show-error') {
          report.current?.(msg.message || msg.title || 'The preview failed to build.');
        }
        if (msg.type === 'done' && !msg.compilatonError) {
          report.current?.(null);
        }
      }),
    [listen],
  );
  return null;
}

const SitePreview = forwardRef(function SitePreview(
  { files, dependencies, onLocation, onPicked, onBuildError, onReady, onRuntimeError, className = '' },
  ref,
) {
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const callbacks = useRef({});
  useLayoutEffect(() => {
    callbacks.current = { onLocation, onPicked, onReady, onRuntimeError };
  });

  useEffect(() => {
    const onMessage = (event) => {
      const msg = event.data;
      if (!msg || msg.source !== 'aic-preview') return;
      const frame = containerRef.current?.querySelector('iframe');
      if (frame && event.source !== frame.contentWindow) return;
      const cb = callbacks.current;
      if (msg.type === 'aic:location') cb.onLocation?.(msg.path);
      if (msg.type === 'aic:picked') cb.onPicked?.(msg.element);
      if (msg.type === 'aic:ready') {
        setReady(true);
        cb.onReady?.();
      }
      if (msg.type === 'aic:error') cb.onRuntimeError?.(msg.message);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const post = useCallback((message) => postToFrame(containerRef.current, message), []);

  useImperativeHandle(
    ref,
    () => ({
      navigate: (path) => post({ type: 'aic:navigate', path }),
      highlight: (target) => post({ type: 'aic:highlight', ...target }),
      clearHighlight: () => post({ type: 'aic:clearHighlight' }),
      pick: (on) => post({ type: 'aic:pick', on }),
    }),
    [post],
  );

  const customSetup = useMemo(() => ({ entry: SANDBOX_ENTRY, dependencies, environment: 'create-react-app' }), [dependencies]);
  const options = useMemo(
    () => ({ activeFile: SANDBOX_ENTRY, recompileMode: 'delayed', recompileDelay: 400, initMode: 'immediate' }),
    [],
  );

  return (
    <div ref={containerRef} className={`relative h-full w-full ${className}`}>
      <SandpackProvider
        template="react"
        files={files}
        customSetup={customSetup}
        options={options}
        className="aic-site-preview"
        style={{ height: '100%' }}
      >
        <ErrorWatcher onBuildError={onBuildError} />
        <SandpackPreview
          style={{ height: '100%', flex: 1 }}
          showNavigator={false}
          showOpenInCodeSandbox={false}
          showRefreshButton={false}
          showSandpackErrorOverlay
        />
      </SandpackProvider>
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
