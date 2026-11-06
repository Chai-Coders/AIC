// Runs inside the preview sandbox, before the website's own code (sandbox.js
// imports it first from src/main.jsx). Plain browser JavaScript, no imports
// from the site, so it keeps working whatever the agent changes in frontend/.
//
// It does three things:
// 1. Serves the draft content: calls to content:siteContent / content:newsItem
//    are answered from content.json (written by the CMS) instead of the live
//    API. When content.json is null the live API is used.
// 2. Talks to the CMS over postMessage (messages are tagged `aic:`):
//      in:  navigate {path}, highlight {selector?, text?, label?}, clearHighlight,
//           pick {on}
//      out: ready, location {path}, picked {...}, highlightResult {found}, error {message}
// 3. Skips the first-visit splash screen and old cached content.

import draftContent from './content.json';

const PARENT = window.parent;
const send = (type, data = {}) => {
  try {
    PARENT.postMessage({ source: 'aic-preview', type: `aic:${type}`, ...data }, '*');
  } catch {
    // Not embedded.
  }
};

try {
  sessionStorage.setItem('aic:splash-seen', '1');
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('aic-cache:')) localStorage.removeItem(key);
  }
} catch {
  // Storage blocked.
}

// --- 1. Draft content -------------------------------------------------------

if (draftContent && !window.__aicFetchPatched) {
  window.__aicFetchPatched = true;
  const realFetch = window.fetch.bind(window);
  const json = (value) =>
    new Response(JSON.stringify({ status: 'success', value }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (url.endsWith('/api/query') && init?.body) {
      try {
        const { path, args } = JSON.parse(init.body);
        const content = window.__aicDraftContent;
        if (!content) return realFetch(input, init);
        if (path === 'content:siteContent') return json(content);
        if (path === 'content:newsItem') return json(content.news.find((n) => n.id === args?.id) ?? null);
      } catch {
        // Not ours; fall through.
      }
    }
    return realFetch(input, init);
  };
}
window.__aicDraftContent = draftContent;

// --- 2. Messages from the CMS ----------------------------------------------

const OUTLINE_ID = '__aic_outline';
const LABEL_ID = '__aic_outline_label';
const ACCENT = '#2f7fd8';
const KEEP_IN_VIEW_MS = 4000;

function removeOutline() {
  document.getElementById(OUTLINE_ID)?.remove();
  document.getElementById(LABEL_ID)?.remove();
}

function clearHighlight() {
  removeOutline();
  window.__aicOutlined = null;
}

const outlineKey = (el) => {
  const r = el.getBoundingClientRect();
  return `${Math.round(r.left + window.scrollX)},${Math.round(r.top + window.scrollY)},${Math.round(r.width)},${Math.round(r.height)}`;
};

function placeOutline(el, label) {
  removeOutline();
  const rect = el.getBoundingClientRect();
  const box = document.createElement('div');
  box.id = OUTLINE_ID;
  Object.assign(box.style, {
    position: 'absolute',
    left: `${rect.left + window.scrollX - 6}px`,
    top: `${rect.top + window.scrollY - 6}px`,
    width: `${rect.width + 12}px`,
    height: `${rect.height + 12}px`,
    border: `3px solid ${ACCENT}`,
    borderRadius: '8px',
    boxShadow: '0 0 0 9999px rgba(10, 20, 35, 0.18)',
    pointerEvents: 'none',
    zIndex: 2147483646,
    transition: 'all 160ms ease-out',
  });
  document.body.appendChild(box);
  if (label) {
    const tag = document.createElement('div');
    tag.id = LABEL_ID;
    tag.textContent = label;
    Object.assign(tag.style, {
      position: 'absolute',
      left: `${rect.left + window.scrollX - 6}px`,
      top: `${Math.max(0, rect.top + window.scrollY - 34)}px`,
      background: ACCENT,
      color: '#fff',
      font: '600 12px/1.2 system-ui, sans-serif',
      padding: '6px 10px',
      borderRadius: '6px',
      pointerEvents: 'none',
      zIndex: 2147483647,
      maxWidth: '360px',
    });
    document.body.appendChild(tag);
  }
  window.__aicOutlined = { ...window.__aicOutlined, el, label, rect: outlineKey(el) };
}

/** First visible element matching `selector`, or containing `text`. */
function findElement({ selector, text }) {
  if (selector) {
    try {
      const el = [...document.querySelectorAll(selector)].find((x) => x.getClientRects().length);
      if (el) return el;
    } catch {
      // Bad selector; try text.
    }
  }
  if (text) {
    const needle = text.trim().toLowerCase();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let best = null;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.textContent.toLowerCase().includes(needle)) {
        const el = node.parentElement;
        if (el && el.getClientRects().length && !el.closest(`#${OUTLINE_ID}`)) {
          best = el;
          break;
        }
      }
    }
    if (best) return best;
  }
  return null;
}

function highlight(target, attempt = 0) {
  const el = findElement(target);
  if (!el) {
    // The page may still be loading (lazy routes, content fetch); retry briefly.
    if (attempt < 80) setTimeout(() => highlight(target, attempt + 1), 100);
    else send('highlightResult', { found: false });
    return;
  }
  // Pages scroll to the top and shift as images load while a route settles, so
  // the loop below keeps bringing the element back for a few seconds.
  window.__aicOutlined = { target, keepInViewUntil: Date.now() + KEEP_IN_VIEW_MS };
  placeOutline(el, target.label);
  el.scrollIntoView({ block: 'center' });
  send('highlightResult', { found: true });
}

function navigate(path) {
  if (!path || path === location.pathname + location.hash) return;
  history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

// Keep the outline on its element when the page reflows, and find the element
// again if React replaces it (content loading in, a route settling).
setInterval(() => {
  const current = window.__aicOutlined;
  if (!current?.el) return;
  if (!current.el.isConnected) {
    const el = current.target && findElement(current.target);
    if (el) placeOutline(el, current.label);
    return;
  }
  if (outlineKey(current.el) !== current.rect) placeOutline(current.el, current.label);
  if (current.keepInViewUntil > Date.now()) {
    const { top, bottom } = current.el.getBoundingClientRect();
    if (top < 0 || bottom > window.innerHeight) current.el.scrollIntoView({ block: 'center' });
  }
}, 250);

// --- Click to point ---------------------------------------------------------

let picking = false;
let hoverEl = null;

function cssPath(el) {
  const parts = [];
  for (let node = el; node && node.nodeType === 1 && node !== document.body && parts.length < 5; node = node.parentElement) {
    let part = node.tagName.toLowerCase();
    if (node.id) {
      parts.unshift(`${part}#${node.id}`);
      break;
    }
    const cls = [...node.classList].filter((c) => !c.startsWith('is-') && !c.startsWith('reveal')).slice(0, 2);
    if (cls.length) part += `.${cls.join('.')}`;
    parts.unshift(part);
  }
  return parts.join(' > ');
}

function describeElement(el) {
  const section = el.closest('section, header, footer, nav, main > *');
  return {
    path: location.pathname + location.hash,
    tag: el.tagName.toLowerCase(),
    selector: cssPath(el),
    text: (el.innerText || el.getAttribute('alt') || '').trim().slice(0, 300),
    classes: [...el.classList],
    sectionSelector: section ? cssPath(section) : null,
    sectionHeading: section?.querySelector('h1, h2, h3')?.innerText?.trim().slice(0, 120) || null,
    src: el.getAttribute('src') || null,
    href: el.getAttribute('href') || null,
  };
}

function onPickMove(e) {
  if (!picking || e.target === hoverEl) return;
  hoverEl = e.target;
  placeOutline(hoverEl, hoverEl.tagName.toLowerCase());
}

function onPickClick(e) {
  if (!picking) return;
  e.preventDefault();
  e.stopPropagation();
  const info = describeElement(e.target);
  setPicking(false);
  placeOutline(e.target, 'Selected');
  send('picked', { element: info });
}

function setPicking(on) {
  picking = on;
  document.documentElement.style.cursor = on ? 'crosshair' : '';
  if (!on) {
    hoverEl = null;
    if (!window.__aicOutlined || window.__aicOutlined.label !== 'Selected') clearHighlight();
  }
}

document.addEventListener('mousemove', onPickMove, true);
document.addEventListener('click', onPickClick, true);

window.addEventListener('message', (event) => {
  // Only the CMS page that embeds this preview can drive it.
  if (event.source !== PARENT) return;
  const msg = event.data;
  if (!msg || typeof msg.type !== 'string' || !msg.type.startsWith('aic:')) return;
  switch (msg.type) {
    case 'aic:navigate':
      clearHighlight();
      navigate(msg.path);
      break;
    case 'aic:highlight':
      if (msg.path && msg.path !== location.pathname) navigate(msg.path);
      highlight({ selector: msg.selector, text: msg.text, label: msg.label });
      break;
    case 'aic:clearHighlight':
      clearHighlight();
      break;
    case 'aic:pick':
      setPicking(!!msg.on);
      break;
    default:
  }
});

// Report navigation so the CMS can show the current page.
let lastPath = '';
setInterval(() => {
  const path = location.pathname + location.hash;
  if (path !== lastPath) {
    lastPath = path;
    send('location', { path });
  }
}, 300);

window.addEventListener('error', (e) => send('error', { message: String(e.message || e.error) }));
// An error boundary keeps a render crash from reaching window.onerror, and React
// only logs it. The build check must still hear about it.
const realConsoleError = console.error.bind(console);
console.error = (...args) => {
  realConsoleError(...args);
  const first = args[0];
  if (first instanceof Error) send('error', { message: first.message });
  else if (typeof first === 'string' && first.includes('error occurred in')) send('error', { message: first.slice(0, 500) });
};
window.addEventListener('unhandledrejection', (e) => send('error', { message: String(e.reason?.message || e.reason) }));

send('ready');
