import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { SITE_URL } from '../routes';

// The real public website in a frame, in its AI Assistant mode, like the Site text
// page. What it shows is the site itself; only the data comes from here (`content`,
// in the shape of content:siteContent). See frontend/src/content/AgentBridge.jsx.
//
// The parent controls it through the ref:
//   navigate(path), highlight({ path, key, selector, text, label }), clearHighlight(), pick(on), marks(items)
// and hears back through the callbacks:
//   onLocation(path), onPicked(element), onPickEnded(), onReady()

const READY_TIMEOUT_MS = 20000;
// The site's layout depends on the window's size: width picks the layout, and height
// sizes the big banners. So that the preview is exactly what visitors see, the frame on
// Desktop is a whole window, the size of the admin's own, shrunk to fit the pane.
const MIN_DESKTOP_WIDTH = 1280;
const PHONE_BREAKPOINT = 768;

/** The frame's real size, its scale, and where it sits, for a container of this size. */
function fit(device, width, height) {
  if (device === 'phone' || window.innerWidth < PHONE_BREAKPOINT || !width) return { width, height, scale: 1, left: 0 };
  const windowWidth = Math.max(MIN_DESKTOP_WIDTH, window.innerWidth);
  const windowHeight = window.innerHeight;
  const scale = Math.min(1, width / windowWidth, height / windowHeight);
  return { width: windowWidth, height: windowHeight, scale, left: Math.max(0, Math.round((width - windowWidth * scale) / 2)) };
}

const siteOrigin = (() => {
  try {
    return SITE_URL ? new URL(SITE_URL).origin : null;
  } catch {
    return null;
  }
})();

const SitePreview = forwardRef(function SitePreview({ content, device = 'desktop', onScale, onLocation, onPicked, onPickEnded, onReady, className = '' }, ref) {
  const frameRef = useRef(null);
  const boxRef = useRef(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const measure = () => {
      const el = boxRef.current;
      if (el) setBox({ width: el.clientWidth, height: el.clientHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(boxRef.current);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const size = fit(device, box.width, box.height);
  useEffect(() => {
    onScale?.(size.scale);
  }, [size.scale, onScale]);
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  // Loaded once; after that it all goes by message, so nothing reloads.
  const [src] = useState(() => (siteOrigin ? `${siteOrigin}/?cms-edit=1&cms-agent=1` : undefined));

  const callbacks = useRef({});
  useLayoutEffect(() => {
    callbacks.current = { onLocation, onPicked, onPickEnded, onReady };
  });

  const post = useCallback((message) => {
    if (siteOrigin) frameRef.current?.contentWindow?.postMessage({ source: 'aic-cms', ...message }, siteOrigin);
  }, []);

  // What the frame should be showing, for when it (re)starts.
  const latest = useRef({ content: null, highlight: null, marks: [], picking: false });

  useEffect(() => {
    latest.current.content = content;
    if (content) post({ type: 'content', content });
  }, [content, post]);

  useEffect(() => {
    if (ready || !siteOrigin) return undefined;
    const timer = setTimeout(() => setTimedOut(true), READY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [ready]);

  useEffect(() => {
    const onMessage = (e) => {
      if (e.origin !== siteOrigin || e.source !== frameRef.current?.contentWindow || e.data?.source !== 'aic-site') return;
      const msg = e.data;
      const cb = callbacks.current;
      if (msg.type === 'agent-ready') {
        setReady(true);
        setTimedOut(false);
        const now = latest.current;
        if (now.content) post({ type: 'content', content: now.content });
        if (now.highlight) post({ type: 'highlight', ...now.highlight });
        post({ type: 'marks', items: now.marks });
        post({ type: 'pick', on: now.picking });
        cb.onReady?.();
      } else if (msg.type === 'location') {
        cb.onLocation?.(String(msg.path || '/'));
      } else if (msg.type === 'picked') {
        cb.onPicked?.(msg.element);
      } else if (msg.type === 'pick-ended') {
        latest.current.picking = false;
        cb.onPickEnded?.();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [post]);

  useImperativeHandle(
    ref,
    () => ({
      navigate: (path) => {
        latest.current.highlight = null;
        post({ type: 'clearHighlight' });
        post({ type: 'navigate', path });
      },
      highlight: (target) => {
        latest.current.highlight = target;
        post({ type: 'highlight', ...target });
      },
      clearHighlight: () => {
        latest.current.highlight = null;
        post({ type: 'clearHighlight' });
      },
      pick: (on) => {
        latest.current.picking = on;
        post({ type: 'pick', on });
      },
      marks: (items) => {
        latest.current.marks = items;
        post({ type: 'marks', items });
      },
    }),
    [post],
  );

  const problem = !siteOrigin
    ? 'The website address is not set. Set VITE_SITE_URL in the CMS’s .env file to the website’s address, then restart the CMS.'
    : timedOut
      ? `The website preview did not load. Check that the website is running at ${SITE_URL} and that its VITE_CMS_URL is set to this CMS’s address (${window.location.origin}).`
      : null;

  return (
    <div ref={boxRef} className={`aic-site-preview relative h-full w-full overflow-hidden bg-muted ${className}`}>
      {src && (
        <iframe
          ref={frameRef}
          src={src}
          title="Website preview"
          className="block border-0 bg-white"
          style={{ width: size.width || '100%', height: size.height || '100%', marginLeft: size.left, transform: size.scale < 1 ? `scale(${size.scale})` : undefined, transformOrigin: '0 0' }}
        />
      )}
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card p-6 text-center text-sm text-muted-foreground">
          {problem ? (
            <>
              <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
              <p className="max-w-md" role="alert">{problem}</p>
            </>
          ) : (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              Loading the website…
            </>
          )}
        </div>
      )}
    </div>
  );
});

export default SitePreview;
