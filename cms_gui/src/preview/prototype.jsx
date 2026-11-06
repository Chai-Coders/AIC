// Phase 0 prototype (see the AI agent design doc): renders the website from
// ../frontend/src in Sandpack. Open /preview-prototype.html?path=/news in dev.
// No sign-in needed: it reads content:siteContent and hands it to the sandbox
// the same way the AI Assistant page hands over the draft.
import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import SitePreview from './SitePreview';
import { buildSandboxFiles, sandboxDependencies } from './sandbox';
import { loadLocalSources } from './localSources';
import '../index.css';

async function fetchContent() {
  const res = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: 'content:siteContent', args: {}, format: 'json' }),
  });
  return (await res.json()).value;
}

const env = { VITE_CONVEX_URL: import.meta.env.VITE_CONVEX_URL };
const assetOrigin = (import.meta.env.VITE_SITE_URL || '').replace(/\/+$/, '');

// eslint-disable-next-line react-refresh/only-export-components -- entry file
function Prototype() {
  const [sources, setSources] = useState(null);
  const [content, setContent] = useState(undefined);
  const [status, setStatus] = useState('loading source');
  const preview = useRef(null);
  const startPath = new URLSearchParams(location.search).get('path') || '/';

  useEffect(() => {
    loadLocalSources().then(setSources);
    fetchContent().then(setContent, () => setContent(null));
  }, []);

  const files = useMemo(
    () => sources && content !== undefined && buildSandboxFiles({ sources, content, env, assetOrigin }),
    [sources, content],
  );
  const deps = useMemo(() => sources && sandboxDependencies(sources['package.json']), [sources]);

  if (!files) return <p>Loading…</p>;
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div id="status" data-status={status} style={{ font: '12px system-ui', padding: 4 }}>{status}</div>
      <div style={{ flex: 1 }}>
        <SitePreview
          ref={preview}
          files={files}
          dependencies={deps}
          onReady={() => {
            setStatus('ready');
            if (startPath !== '/') preview.current.navigate(startPath);
          }}
          onLocation={(p) => setStatus(`ready ${p}`)}
          onBuildError={(e) => e && setStatus(`error: ${e}`)}
          onRuntimeError={(e) => setStatus(`runtime error: ${e}`)}
        />
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Prototype />
  </StrictMode>,
);
