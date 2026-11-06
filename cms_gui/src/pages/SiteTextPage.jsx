import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { AlertCircle, ArrowUp, Code2, Loader2, Rows3 } from 'lucide-react';
import { api } from '../services/api';
import { SITE_URL } from '../routes';
import FieldsPanel from '../components/sitetext/FieldsPanel';
import CodePanel from '../components/sitetext/CodePanel';
import PreviewFrame from '../components/sitetext/PreviewFrame';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

// Edit every text on the website next to a live preview of it. The website
// itself (frontend/src/content/registry.js) says which texts exist, sending
// them when it loads in the preview; see frontend/src/content/CmsBridge.jsx
// for the messages. Edits stay a draft in this browser until published.

const DRAFT_STORAGE = 'aic-cms:site-text-draft';
const MAX_LENGTH = 5000; // Same limit as convex-backend/convex/siteText.ts.
const READY_TIMEOUT_MS = 20000;

const siteOrigin = (() => {
  try {
    return SITE_URL ? new URL(SITE_URL).origin : null;
  } catch {
    return null;
  }
})();

function loadDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_STORAGE));
    return draft && typeof draft === 'object' ? draft : {};
  } catch {
    return {};
  }
}

function saveDraft(draft) {
  try {
    if (Object.keys(draft).length) localStorage.setItem(DRAFT_STORAGE, JSON.stringify(draft));
    else localStorage.removeItem(DRAFT_STORAGE);
  } catch {
    // Storage unavailable: the draft just won't survive a reload.
  }
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function Segmented({ value, onChange, options, label }) {
  return (
    <div role="group" aria-label={label} className="inline-flex gap-0.5 rounded-lg bg-muted p-[3px]">
      {options.map(({ value: v, label: text, icon: Icon }) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
            value === v ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon className="h-[15px] w-[15px]" />
          {text}
        </button>
      ))}
    </div>
  );
}

export default function SiteTextPage() {
  const { showToast } = useOutletContext();
  const frameRef = useRef(null);

  const [registry, setRegistry] = useState(null); // { pages, shared } from the website
  // { key: text } published from here. Live: undoing on the Versions page or
  // approving an AI change shows up here straight away.
  const published = useQuery(anyApi.siteText.published) ?? null;
  const [frameTimedOut, setFrameTimedOut] = useState(false);
  const [draft, setDraft] = useState(loadDraft); // { key: text } not published yet
  const [pageId, setPageId] = useState('home');
  const [path, setPath] = useState('/');
  const [selected, setSelected] = useState(null);
  const [focusRequest, setFocusRequest] = useState(null);
  const [mode, setMode] = useState('fields');
  const [device, setDevice] = useState('desktop');
  const [publishing, setPublishing] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [codeVersion, setCodeVersion] = useState(0);

  const send = useCallback((message) => {
    frameRef.current?.contentWindow?.postMessage({ source: 'aic-cms', ...message }, siteOrigin);
  }, []);

  // --- Loading -------------------------------------------------------------

  useEffect(() => {
    if (registry || !siteOrigin) return;
    const timer = setTimeout(() => setFrameTimedOut(true), READY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [registry]);

  useEffect(() => saveDraft(draft), [draft]);

  // --- Derived state -------------------------------------------------------

  const fields = useMemo(() => {
    if (!registry) return {};
    const all = [...registry.shared, ...registry.pages.flatMap((p) => p.groups)].flatMap((g) => g.fields);
    return Object.fromEntries(all.map((f) => [f.key, f]));
  }, [registry]);

  const page = registry?.pages.find((p) => p.id === pageId) ?? registry?.pages[0];

  const groups = useMemo(
    () => (page ? [...page.groups, ...registry.shared.map((g) => ({ ...g, shared: true }))] : []),
    [page, registry]
  );
  const pageKeys = useMemo(() => new Set(groups.flatMap((g) => g.fields.map((f) => f.key))), [groups]);

  const baseOf = useCallback((key) => published?.[key] ?? fields[key]?.value ?? '', [published, fields]);
  const valueOf = useCallback((key) => draft[key] ?? baseOf(key), [draft, baseOf]);
  const isEdited = useCallback((key) => key in draft && draft[key] !== baseOf(key), [draft, baseOf]);

  const changedKeys = useMemo(
    () => (registry && published ? Object.keys(draft).filter((key) => key in fields && draft[key] !== baseOf(key)) : []),
    [registry, published, draft, fields, baseOf]
  );

  // --- Talking to the preview ----------------------------------------------

  // Keep the preview showing the draft.
  useEffect(() => {
    if (registry && published) send({ type: 'values', values: { ...published, ...draft } });
  }, [registry, published, draft, send]);

  const select = useCallback(
    (key, { from } = {}) => {
      setSelected(key);
      if (from !== 'preview') send({ type: 'highlight', key });
      if (from !== 'field') setFocusRequest({ key });
    },
    [send]
  );

  // A new page in the preview gets fresh panels.
  const changePage = useCallback(
    (id) => {
      if (id === pageId) return;
      setPageId(id);
      setSelected(null);
      setFocusRequest(null);
    },
    [pageId]
  );

  useEffect(() => {
    const onMessage = (e) => {
      if (e.origin !== siteOrigin || e.source !== frameRef.current?.contentWindow || e.data?.source !== 'aic-site') return;
      const msg = e.data;
      if (msg.type === 'ready' && Array.isArray(msg.pages) && Array.isArray(msg.shared)) {
        setRegistry({ pages: msg.pages, shared: msg.shared });
        setFrameTimedOut(false);
      } else if (msg.type === 'route' && typeof msg.page === 'string') {
        changePage(msg.page);
        setPath(String(msg.path || '/'));
      } else if (msg.type === 'select' && typeof msg.key === 'string') {
        select(msg.key, { from: 'preview' });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [select, changePage]);

  const openPage = (id) => {
    const target = registry.pages.find((p) => p.id === id);
    if (!target) return;
    changePage(id);
    send({ type: 'navigate', path: target.path });
  };

  // --- Editing -------------------------------------------------------------

  const setValues = useCallback(
    (values) =>
      setDraft((prev) => {
        let next = prev;
        for (const [key, value] of Object.entries(values)) {
          if (value === (prev[key] ?? baseOf(key))) continue;
          if (next === prev) next = { ...prev };
          if (value === baseOf(key)) delete next[key];
          else next[key] = value;
        }
        return next;
      }),
    [baseOf]
  );

  const setValue = useCallback((key, value) => setValues({ [key]: value }), [setValues]);

  const undo = useCallback(
    (key) =>
      setDraft((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      }),
    []
  );

  const restore = useCallback((key) => setValue(key, fields[key].value), [setValue, fields]);

  const publish = useCallback(async () => {
    if (!changedKeys.length || publishing) return;
    const tooLong = changedKeys.find((key) => draft[key].length > MAX_LENGTH);
    if (tooLong) {
      showToast?.(`“${fields[tooLong].label}” is too long. Please keep it under ${MAX_LENGTH} characters.`, 'error');
      select(tooLong);
      return;
    }
    setPublishing(true);
    try {
      // Text set back to the website's own wording drops the edit instead of storing a copy.
      const changes = changedKeys.map((key) => ({ key, value: draft[key] === fields[key].value ? null : draft[key] }));
      await api.endpoints.siteText.publish(changes);
      setDraft({});
      setCodeVersion((v) => v + 1);
      showToast?.(`Published ${plural(changes.length, 'change')}. Visitors will see it within a minute. You can undo it from Versions.`, 'success');
    } catch (err) {
      showToast?.(err.message || 'Publishing failed. Please try again.', 'error');
    } finally {
      setPublishing(false);
    }
  }, [changedKeys, publishing, draft, fields, showToast, select]);

  const discard = () => {
    setDraft({});
    setCodeVersion((v) => v + 1);
    setConfirmDiscard(false);
    showToast?.('Unpublished changes discarded.', 'info');
  };

  // Ctrl/Cmd+S publishes.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        publish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [publish]);

  // --- Rendering -----------------------------------------------------------

  const ready = Boolean(registry && published);
  const count = changedKeys.length;
  const hint = selected && fields[selected] ? `Editing “${fields[selected].label}”` : 'Click any text to edit it · Ctrl-click follows a link';

  const stuck = !siteOrigin || (frameTimedOut && !registry);
  let overlay = null;
  if (!siteOrigin) {
    overlay = (
      <Notice title="The website address is not set">
        Set <code className="font-mono">VITE_SITE_URL</code> in the CMS’s .env file to the website’s address, then restart the CMS.
      </Notice>
    );
  } else if (frameTimedOut && !registry) {
    overlay = (
      <Notice title="The website preview did not load">
        Check that the website is running at <code className="font-mono">{SITE_URL}</code> and that its{' '}
        <code className="font-mono">VITE_CMS_URL</code> is set to this CMS’s address ({window.location.origin}).
      </Notice>
    );
  } else if (!registry) {
    overlay = <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading the website" />;
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col md:h-dvh">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3 sm:px-5">
        <div className="min-w-40 flex-1 basis-0">
          <h1 className="text-lg font-bold tracking-tight text-foreground">Site text</h1>
          <p className="truncate text-xs text-muted-foreground">
            Click text in the preview to edit it. Changes are kept as a draft in this browser until you publish them.
          </p>
        </div>

        {registry && (
          <label className="w-52 max-w-full">
            <span className="sr-only">Page</span>
            <select value={page?.id} onChange={(e) => openPage(e.target.value)} className="field py-2 font-medium">
              {registry.pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <Segmented
          label="Editing mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'fields', label: 'Fields', icon: Rows3 },
            { value: 'code', label: 'Code', icon: Code2 },
          ]}
        />

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            count ? 'bg-warning/15 text-foreground' : 'bg-muted text-muted-foreground'
          }`}
          role="status"
        >
          <i className={`h-[7px] w-[7px] rounded-full ${count ? 'bg-warning' : 'bg-success'}`} />
          {count ? `${plural(count, 'unpublished change')}` : 'All changes published'}
        </span>

        <button type="button" className="btn-secondary py-2" disabled={!count || publishing} onClick={() => setConfirmDiscard(true)}>
          Discard
        </button>
        <button type="button" className="btn-primary py-2" disabled={!count || publishing} onClick={publish} title="Publish (Ctrl+S)">
          {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          <span>{publishing ? 'Publishing…' : 'Publish'}</span>
        </button>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(280px,45%)_1fr] lg:grid-cols-[minmax(340px,420px)_1fr] lg:grid-rows-1">
        <section aria-label="Editor" className="flex min-h-0 flex-col border-b border-border bg-card lg:border-b-0 lg:border-r">
          {!ready ? (
            <div className="flex flex-1 items-center justify-center">
              {!stuck && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />}
            </div>
          ) : mode === 'fields' ? (
            <FieldsPanel
              key={pageId}
              groups={groups}
              valueOf={valueOf}
              isEdited={isEdited}
              selected={selected}
              focusRequest={focusRequest}
              onChange={setValue}
              onUndo={undo}
              onRestore={restore}
              onSelect={(key) => select(key, { from: 'field' })}
            />
          ) : (
            <CodePanel
              key={`${pageId}:${codeVersion}`}
              fileName={`${page.id}.txt`}
              groups={groups}
              valueOf={valueOf}
              knownKeys={pageKeys}
              selected={selected}
              focusRequest={focusRequest}
              onChangeMany={setValues}
              onSelect={(key) => select(key, { from: 'field' })}
            />
          )}
        </section>

        {siteOrigin ? (
          <PreviewFrame
            ref={frameRef}
            siteUrl={SITE_URL.replace(/\/+$/, '')}
            path={path}
            hint={hint}
            device={device}
            onDeviceChange={setDevice}
            onLoad={() => send({ type: 'hello' })}
            overlay={overlay}
          />
        ) : (
          <div className="flex items-center justify-center p-6">{overlay}</div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={discard}
        title="Discard unpublished changes?"
        message={`This removes ${plural(count, 'change')} that ${count === 1 ? 'has' : 'have'} not been published. The website stays as it is.`}
        confirmLabel="Discard"
      />
    </div>
  );
}

function Notice({ title, children }) {
  return (
    <div className="max-w-md space-y-2 text-center">
      <AlertCircle className="mx-auto h-8 w-8 text-warning" />
      <p className="font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
