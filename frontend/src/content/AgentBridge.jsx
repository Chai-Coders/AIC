import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { setPreviewContent } from '../api/content';
import { CMS_ORIGIN } from './editMode';

// Runs only inside the CMS's AI Assistant preview. All messages carry `source`,
// and are only exchanged with the CMS's address.
//   CMS -> site  content { content }   navigate { path }   clearHighlight
//                highlight { path, key?, selector?, text?, label? }
//                pick { on }   marks { items: [{ n, path, key?, selector, text }] }
//   site -> CMS  agent-ready   location { path }   picked { element }   pick-ended

const SOURCE = 'aic-site';
const ACCENT = '#2f7fd8';
const KEEP_IN_VIEW_MS = 4000;
const GIVE_UP_FINDING_MS = 10000;
const RETRY_MISSING_MS = 1000;

const post = (message) => window.parent.postMessage({ source: SOURCE, ...message }, CMS_ORIGIN);
const pathNow = () => window.location.pathname + window.location.hash;

const isShown = (el) => el.getClientRects().length > 0 && !el.closest('[data-aic]');

const byKey = (key) => (key ? [...document.querySelectorAll(`[data-cms-key="${CSS.escape(key)}"]`)].find(isShown) : null);

function bySelector(selector) {
  try {
    return selector ? [...document.querySelectorAll(selector)].find(isShown) : null;
  } catch {
    return null; // A bad selector from the model.
  }
}

/** The element for a website text's key, a selector, or (first visible) text. */
function findElement({ key, selector, text, selectorFirst }) {
  // A text can show in several places; a click's selector says exactly which one.
  const found = selectorFirst ? bySelector(selector) || byKey(key) : byKey(key) || bySelector(selector);
  if (found) return found;
  if (text) {
    const needle = text.trim().toLowerCase();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const el = walker.currentNode.parentElement;
      if (el && walker.currentNode.textContent.toLowerCase().includes(needle) && isShown(el)) return el;
    }
  }
  return null;
}

const boxOf = (el) => {
  const r = el.getBoundingClientRect();
  return { left: r.left + window.scrollX, top: r.top + window.scrollY, width: r.width, height: r.height };
};
const keyOf = (el) => Object.values(boxOf(el)).map(Math.round).join(',');

/** A plain, numbered description of an element, for the agent. */
function cssPath(el) {
  const parts = [];
  for (let node = el; node && node.nodeType === 1 && node !== document.body && parts.length < 6; node = node.parentElement) {
    let part = node.tagName.toLowerCase();
    if (node.id) {
      parts.unshift(`${part}#${CSS.escape(node.id)}`);
      break;
    }
    const classes = [...node.classList].filter((c) => !c.startsWith('is-') && !c.startsWith('reveal')).slice(0, 2);
    if (classes.length) part += `.${classes.map((c) => CSS.escape(c)).join('.')}`;
    // Tells repeated things, like the cards in a grid, apart.
    const same = node.parentElement ? [...node.parentElement.children].filter((c) => c.tagName === node.tagName) : [];
    if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`;
    parts.unshift(part);
  }
  return parts.join(' > ');
}

/** The website text this element shows: not just the first of several inside a card. */
function keyShownBy(el) {
  const around = el.closest('[data-cms-key]');
  if (around) return around.dataset.cmsKey;
  const inside = el.querySelector('[data-cms-key]');
  return inside && inside.innerText.trim() === el.innerText.trim() ? inside.dataset.cmsKey : null;
}

function describeElement(el) {
  const section = el.closest('section, header, footer, nav, main > *');
  return {
    path: pathNow(),
    tag: el.tagName.toLowerCase(),
    selector: cssPath(el),
    // The website text it shows, if any: the exact name to edit it by.
    key: keyShownBy(el),
    text: (el.innerText || el.getAttribute('alt') || '').trim().slice(0, 300),
    classes: [...el.classList],
    sectionHeading: section?.querySelector('h1, h2, h3')?.innerText?.trim().slice(0, 120) || null,
    src: el.getAttribute('src') || null,
    href: el.getAttribute('href') || null,
  };
}

function drawBox(id, el, label) {
  const box = document.createElement('div');
  box.id = id;
  box.dataset.aic = '1';
  const { left, top, width, height } = boxOf(el);
  Object.assign(box.style, {
    position: 'absolute',
    left: `${left - 6}px`,
    top: `${top - 6}px`,
    width: `${width + 12}px`,
    height: `${height + 12}px`,
    border: `3px solid ${ACCENT}`,
    borderRadius: '8px',
    pointerEvents: 'none',
    zIndex: 2147483646,
  });
  if (label) {
    const tag = document.createElement('div');
    tag.textContent = label;
    Object.assign(tag.style, {
      position: 'absolute',
      left: '-3px',
      top: '-31px',
      maxWidth: '360px',
      padding: '5px 9px',
      borderRadius: '6px',
      background: ACCENT,
      color: '#fff',
      font: '600 12px/1.2 system-ui, sans-serif',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    });
    box.appendChild(tag);
  }
  document.body.appendChild(box);
}

function drawMark(n, el) {
  const box = document.createElement('div');
  box.dataset.aic = '1';
  box.dataset.aicMark = String(n);
  const { left, top, width, height } = boxOf(el);
  Object.assign(box.style, {
    position: 'absolute',
    left: `${left - 3}px`,
    top: `${top - 3}px`,
    width: `${width + 6}px`,
    height: `${height + 6}px`,
    border: `2px solid ${ACCENT}`,
    borderRadius: '6px',
    background: 'rgba(47, 127, 216, 0.10)',
    pointerEvents: 'none',
    zIndex: 2147483645,
  });
  const badge = document.createElement('div');
  badge.textContent = String(n);
  Object.assign(badge.style, {
    position: 'absolute',
    left: '-10px',
    top: '-10px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: ACCENT,
    color: '#fff',
    font: '700 11px/20px system-ui, sans-serif',
    textAlign: 'center',
  });
  box.appendChild(badge);
  document.body.appendChild(box);
}

export default function AgentBridge() {
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  });

  useEffect(() => post({ type: 'location', path: pathname + hash }), [pathname, hash]);

  useEffect(() => {
    const OUTLINE = '__aic_outline';
    const HOVER = '__aic_hover';
    let target = null; // What's outlined: { key, selector, text, label, path, giveUpAt, until }
    let targetEl = null;
    let targetBox = '';
    let picking = false;
    let hovered = null;
    let marks = []; // Each also remembers its element (`el`) and when it last looked (`tried`).
    let marksDrawn = '';

    const clearOutline = () => document.getElementById(OUTLINE)?.remove();
    const clearHover = () => document.getElementById(HOVER)?.remove();
    const dropTarget = () => {
      target = null;
      targetEl = null;
      clearOutline();
    };

    // Elements get replaced as content loads and move as images arrive, so this
    // keeps the outline and the numbers on them.
    const tick = () => {
      if (target) {
        const el = targetEl?.isConnected ? targetEl : findElement(target);
        if (!el) {
          clearOutline();
          targetEl = null;
          if (!target.until && Date.now() > target.giveUpAt) dropTarget();
          // The element went away: the admin moved on to another page.
          else if (target.until && window.location.pathname !== target.path) dropTarget();
        } else {
          // The time to bring it into view starts once it exists: pages load lazily.
          target.until ??= Date.now() + KEEP_IN_VIEW_MS;
          const box = keyOf(el);
          if (el !== targetEl || box !== targetBox) {
            targetEl = el;
            targetBox = box;
            clearOutline();
            drawBox(OUTLINE, el, target.label);
          }
          if (target.until > Date.now()) {
            const { top, bottom } = el.getBoundingClientRect();
            if (top < 60 || bottom > window.innerHeight) el.scrollIntoView({ block: 'center' });
          }
        }
      }
      const here = pathNow();
      const found = [];
      for (const mark of marks) {
        if (mark.path !== here) continue;
        // Searching the page is costly, so keep what was found, and look less often for what wasn't.
        if (!mark.el?.isConnected && Date.now() - (mark.tried ?? 0) >= RETRY_MISSING_MS) {
          mark.tried = Date.now();
          mark.el = findElement({ ...mark, selectorFirst: true });
        }
        if (mark.el?.isConnected) found.push(mark);
      }
      const drawn = found.map((m) => `${m.n}@${keyOf(m.el)}`).join('|');
      if (drawn !== marksDrawn) {
        marksDrawn = drawn;
        document.querySelectorAll('[data-aic-mark]').forEach((node) => node.remove());
        found.forEach((m) => drawMark(m.n, m.el));
      }
    };
    const timer = setInterval(tick, 200);

    const setPicking = (on) => {
      picking = on;
      document.documentElement.style.cursor = on ? 'crosshair' : '';
      if (!on) {
        hovered = null;
        clearHover();
      }
    };

    const onMove = (e) => {
      if (!picking || e.target === hovered || e.target?.closest?.('[data-aic]')) return;
      hovered = e.target;
      clearHover();
      drawBox(HOVER, hovered, hovered.tagName.toLowerCase());
    };
    const onClick = (e) => {
      if (!picking) return;
      e.preventDefault();
      e.stopPropagation();
      // Ctrl/Cmd-click follows a link inside the preview, to point at things on another page.
      if (e.ctrlKey || e.metaKey) {
        const link = e.target.closest?.('a[href]');
        const url = link && new URL(link.href, window.location.href);
        if (url?.origin === window.location.origin) navigateRef.current(url.pathname + url.search + url.hash);
        return;
      }
      post({ type: 'picked', element: describeElement(e.target) });
    };
    const onKey = (e) => {
      if (picking && e.key === 'Escape') {
        setPicking(false);
        post({ type: 'pick-ended' });
      }
    };

    const onMessage = (e) => {
      if (e.origin !== CMS_ORIGIN || e.source !== window.parent || e.data?.source !== 'aic-cms') return;
      const msg = e.data;
      if (msg.type === 'content' && msg.content && typeof msg.content === 'object') {
        setPreviewContent(msg.content);
      } else if (msg.type === 'navigate' && typeof msg.path === 'string' && msg.path.startsWith('/')) {
        navigateRef.current(msg.path);
      } else if (msg.type === 'highlight') {
        if (typeof msg.path === 'string' && msg.path.startsWith('/') && msg.path !== window.location.pathname) navigateRef.current(msg.path);
        target = { key: msg.key, selector: msg.selector, text: msg.text, label: msg.label, path: msg.path || window.location.pathname, giveUpAt: Date.now() + GIVE_UP_FINDING_MS };
        targetEl = null;
        targetBox = '';
        clearOutline();
      } else if (msg.type === 'clearHighlight') {
        dropTarget();
      } else if (msg.type === 'pick') {
        setPicking(!!msg.on);
      } else if (msg.type === 'marks' && Array.isArray(msg.items)) {
        marks = msg.items;
        marksDrawn = null;
      }
    };

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('message', onMessage);
    post({ type: 'agent-ready' });
    return () => {
      clearInterval(timer);
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('message', onMessage);
      clearOutline();
      clearHover();
    };
  }, []);

  return null;
}
