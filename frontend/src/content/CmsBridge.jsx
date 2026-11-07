import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FIELDS, PAGES, SHARED, pageForPath } from './registry';
import { AGENT_MODE, CMS_ORIGIN, EDIT_MODE } from './editMode';
import { useTextContext } from './useText';

// Runs only inside the CMS preview. Messages (all carry `source`):
//   site -> CMS  ready { pages, shared }   route { path, page }   select { key }
//   CMS -> site  hello   values { values }   highlight { key }   navigate { path }

const SOURCE = 'aic-site';

const STYLE = `
[data-cms-key] { cursor: text; border-radius: 3px; outline: 2px dashed transparent; outline-offset: 2px; transition: outline-color .1s, background-color .1s; }
[data-cms-key]:hover { outline-color: rgb(20 148 206 / .75); background-color: rgb(20 148 206 / .1); }
[data-cms-key].cms-selected { outline: 2px solid #1494ce; background-color: rgb(20 148 206 / .14); }
[data-cms-key]:empty { display: inline-block; min-width: 2em; min-height: 1em; }
.cms-chip { position: fixed; z-index: 2147483647; pointer-events: none; padding: 4px 8px; border-radius: 6px; background: #1494ce; color: #fff; font: 600 11px/1.2 system-ui, sans-serif; white-space: nowrap; box-shadow: 0 4px 12px rgb(0 0 0 / .25); }
`;

const post = (message) => window.parent.postMessage({ source: SOURCE, ...message }, CMS_ORIGIN);

const isVisible = (el) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.top >= 60 && r.bottom <= window.innerHeight - 40;
};

function Bridge() {
  const { setDrafts } = useTextContext();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [selected, setSelected] = useState(null);
  const scrollTo = useRef(false);

  // Styles for selectable text, and the label shown when hovering it.
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.append(style);
    const chip = document.createElement('div');
    chip.className = 'cms-chip';
    chip.hidden = true;
    document.body.append(chip);

    const onOver = (e) => {
      const el = e.target.closest?.('[data-cms-key]');
      const field = el && FIELDS[el.dataset.cmsKey];
      if (!field) {
        chip.hidden = true;
        return;
      }
      chip.textContent = field.label;
      chip.hidden = false;
      const r = el.getBoundingClientRect();
      chip.style.left = `${Math.max(4, Math.min(r.left, window.innerWidth - chip.offsetWidth - 4))}px`;
      chip.style.top = `${r.top > 30 ? r.top - 26 : r.bottom + 6}px`;
    };
    const hide = () => {
      chip.hidden = true;
    };
    document.addEventListener('mouseover', onOver);
    window.addEventListener('scroll', hide, { passive: true });
    return () => {
      document.removeEventListener('mouseover', onOver);
      window.removeEventListener('scroll', hide);
      style.remove();
      chip.remove();
    };
  }, []);

  // Clicking text selects it in the CMS instead of following links or opening
  // menus; Ctrl/Cmd-click still navigates. Links that would leave the site and
  // form submissions are blocked.
  useEffect(() => {
    const onClick = (e) => {
      const el = e.target.closest?.('[data-cms-key]');
      if (el && !(e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        setSelected(el.dataset.cmsKey);
        post({ type: 'select', key: el.dataset.cmsKey });
        return;
      }
      const link = e.target.closest?.('a[href]');
      if (link && (link.target === '_blank' || new URL(link.href, window.location.href).origin !== window.location.origin)) {
        e.preventDefault();
      }
    };
    const onSubmit = (e) => e.preventDefault();
    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, []);

  useEffect(() => {
    const onMessage = (e) => {
      if (e.origin !== CMS_ORIGIN || e.source !== window.parent || e.data?.source !== 'aic-cms') return;
      const msg = e.data;
      if (msg.type === 'hello') {
        post({ type: 'ready', pages: PAGES, shared: SHARED });
        post({ type: 'route', path: window.location.pathname, page: pageForPath(window.location.pathname) });
      } else if (msg.type === 'values' && msg.values && typeof msg.values === 'object') {
        setDrafts(msg.values);
      } else if (msg.type === 'highlight') {
        scrollTo.current = true;
        setSelected(typeof msg.key === 'string' ? msg.key : null);
      } else if (msg.type === 'navigate' && typeof msg.path === 'string' && msg.path.startsWith('/')) {
        navigate(msg.path);
      }
    };
    window.addEventListener('message', onMessage);
    post({ type: 'ready', pages: PAGES, shared: SHARED });
    return () => window.removeEventListener('message', onMessage);
  }, [navigate, setDrafts]);

  useEffect(() => {
    post({ type: 'route', path: pathname, page: pageForPath(pathname) });
  }, [pathname]);

  // Outline the selected text. Pages load lazily and lists arrive from the
  // API, so look again briefly until it shows up.
  useEffect(() => {
    let tries = 0;
    let timer;
    const apply = () => {
      document.querySelectorAll('.cms-selected').forEach((el) => el.classList.remove('cms-selected'));
      if (!selected) return;
      const els = [...document.querySelectorAll(`[data-cms-key="${CSS.escape(selected)}"]`)];
      els.forEach((el) => el.classList.add('cms-selected'));
      const target = els.find((el) => el.getBoundingClientRect().width > 0);
      if (target && scrollTo.current) {
        scrollTo.current = false;
        if (!isVisible(target)) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } else if (!target && ++tries < 20) {
        timer = setTimeout(apply, 100);
      }
    };
    apply();
    return () => clearTimeout(timer);
  }, [selected, pathname]);

  return null;
}

export default function CmsBridge() {
  return EDIT_MODE && !AGENT_MODE ? <Bridge /> : null;
}
