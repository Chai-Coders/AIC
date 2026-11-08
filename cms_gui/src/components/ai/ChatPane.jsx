import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { AlertTriangle, Check, ChevronDown, Crosshair, ImagePlus, Loader2, Plus, Send, Sparkles, Square, Trash2, X } from 'lucide-react';
import { run } from '../../services/convex';
import { uploadImage } from '../../lib/upload';
import SpendMeter from './SpendMeter';

const api = anyApi.ai;

const MAX_PICTURES = 3; // Same limit as convex-backend/convex/ai/chat.ts.

// Models mark up lists like "**Name**", which should read as bold, not as asterisks.
const withBold = (text) => text.split(/\*\*([^*\n]+)\*\*/).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));

// What the agent is doing, in the admin's words.
const TOOL_LABELS = {
  get_site_content: 'Read the site content',
  get_site_text: 'Read the website text',
  update_site_text: 'Edited the website text in the draft',
  search_media: 'Looked through the media library',
  get_selected_element: 'Looked at the element you pointed to',
  update_record: 'Edited a record in the draft',
  add_person: 'Added a person to the draft',
  add_startup: 'Added a startup to the draft',
  add_news: 'Added a news post to the draft',
  add_gallery_photo: 'Added a photo to the draft',
  remove_change: 'Corrected the list of changes',
  delete_record: 'Asked to delete a record',
  swap_media: 'Swapped a picture in the draft',
  describe_change: 'Noted the change',
};

const STATUS_TEXT = {
  drafting: 'Working on your request…',
  reviewing: 'The review agent is checking the change…',
};

function Message({ message }) {
  if (message.role === 'note') {
    return (
      <p className="mx-4 rounded-lg bg-muted px-3 py-2 text-xs whitespace-pre-wrap text-muted-foreground">{message.text}</p>
    );
  }
  if (message.role === 'user') {
    const text = message.text.split('\n\n(The admin ')[0];
    return (
      <div className="flex justify-end px-4">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap text-primary-foreground">{text}</p>
      </div>
    );
  }
  const activity = [...new Set(message.tools.map((t) => TOOL_LABELS[t]).filter(Boolean))];
  return (
    <div className="space-y-2 px-4">
      {activity.length > 0 && (
        <ul aria-label="What the assistant did" className="flex flex-wrap gap-1.5">
          {activity.map((line) => (
            <li key={line} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              <Check className="h-3 w-3 text-success" aria-hidden="true" /> {line}
            </li>
          ))}
        </ul>
      )}
      {message.text && <p className="text-sm whitespace-pre-wrap text-foreground">{withBold(message.text)}</p>}
      {message.failed && <p className="text-xs text-destructive">This step failed.</p>}
    </div>
  );
}

// Ready-made openings for the most common requests. Picking one fills in the message box.
const STARTERS = [
  { title: 'Change some words', hint: 'Headings, paragraphs and buttons on any page', prompt: 'On the home page, change the heading to ' },
  { title: 'Add a person', hint: 'Team, board member or mentor', prompt: 'Add a new mentor (India, industry): name , job title ' },
  { title: 'Post news', hint: 'Attach a picture for it', prompt: 'Post a news update about ' },
  { title: 'Update contact details', hint: 'Address, emails, phones, links', prompt: 'Update our phone numbers to ' },
];

function Welcome({ onPick }) {
  return (
    <div className="space-y-5 px-4 py-4">
      <div className="space-y-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-bold tracking-tight text-foreground">What would you like to change?</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Tell me in your own words. You'll see it on the website on the right, and nothing goes live until you approve it on the Versions page.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {STARTERS.map((s) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={() => onPick(s.prompt)}
              className="flex h-full w-full flex-col gap-1 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent"
            >
              <span className="text-sm font-semibold text-foreground">{s.title}</span>
              <span className="text-xs leading-snug text-muted-foreground">{s.hint}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="flex gap-2.5 rounded-xl bg-muted p-3 text-xs leading-relaxed text-foreground">
        <Crosshair className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span>
          <strong>Tip:</strong> press <strong>Point</strong>, click things on the website, then say what they should become. No need to describe where they are.
        </span>
      </p>
    </div>
  );
}

const STEPS = ['Editing', 'Checking', 'Approval', 'Live'];

/** Where a request is: the assistant at work, the review, approval on Versions, live. */
function Progress({ draft, sent, outcome }) {
  let at = -1;
  let stuck = false;
  if (outcome === 'approved') at = STEPS.length;
  else if (sent) at = 2;
  else if (draft?.status === 'reviewing') at = 1;
  else if (draft?.status === 'drafting' && draft.running) at = 0;
  else if (draft?.status === 'needs_admin') {
    at = draft.review?.verdict === 'rejected' ? 1 : 0;
    stuck = true;
  }
  if (at < 0) return null;
  return (
    <ol aria-label="Progress" className="flex items-center gap-1 border-b border-border px-4 py-2.5 text-[11px] font-semibold">
      {STEPS.map((label, i) => {
        const done = i < at;
        const now = i === at;
        const tone = done ? 'text-success' : now ? (stuck ? 'text-warning' : 'text-primary') : 'text-muted-foreground';
        return (
          <li key={label} aria-current={now ? 'step' : undefined} className={`flex min-w-0 items-center gap-1 ${tone}`}>
            {i > 0 && <span aria-hidden="true" className={`h-px w-3 shrink-0 ${done || now ? 'bg-current' : 'bg-border'}`} />}
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                done ? 'bg-success/15' : now ? (stuck ? 'bg-warning/15' : 'bg-primary text-primary-foreground') : 'border border-border'
              }`}
            >
              {done ? <Check className="h-2.5 w-2.5" aria-hidden="true" /> : now && !stuck && i < 2 ? <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" /> : i + 1}
            </span>
            <span className="truncate">{now && stuck ? 'Needs you' : label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The assistant works in steps, each saved as a message. Steps with no words
 * are folded into the reply they lead to, so the chat shows one set of
 * activity per reply instead of a line per step.
 */
function mergeSteps(messages) {
  const out = [];
  let pending = [];
  for (const m of messages) {
    if (m.role !== 'assistant') {
      if (pending.length) out.push({ id: `steps-${out.length}`, role: 'assistant', text: '', tools: pending, failed: false });
      pending = [];
      out.push(m);
    } else if (!m.text && !m.failed) {
      pending = [...pending, ...m.tools];
    } else {
      out.push({ ...m, tools: [...pending, ...m.tools] });
      pending = [];
    }
  }
  if (pending.length) out.push({ id: `steps-${out.length}`, role: 'assistant', text: '', tools: pending, failed: false });
  return out;
}

const pageName = (page) => (!page ? '' : page === '/' ? 'Home page' : page);

/** The draft's changes, numbered as on the website. Choosing one shows it there. */
function ChangeCards({ changes, step, onShow }) {
  if (!changes.length) return null;
  return (
    <ol aria-label="The changes" className="space-y-2">
      {changes.map((c, i) => (
        <li key={`${i} ${c.summary}`}>
          <button
            type="button"
            onClick={() => onShow(i)}
            aria-current={i === step ? 'true' : undefined}
            className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
              i === step ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted'
            }`}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">{c.summary}</span>
              <span className="text-xs text-muted-foreground">
                {pageName(c.page)}
                {c.page ? ' · ' : ''}
                <span className="font-semibold text-primary">Show on page</span>
              </span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function ConfirmCard({ draft, onError }) {
  const answer = useMutation(api.chat.answerConfirm);
  const [busy, setBusy] = useState(false);
  const pending = draft.pendingConfirm;
  const respond = async (approve) => {
    setBusy(true);
    try {
      await run(() => answer({ changeSetId: draft._id, approve }));
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div role="alertdialog" aria-label="Confirm delete" className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <div className="flex items-start gap-2.5">
        <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Delete this record?
          </p>
          <p className="text-sm break-words text-foreground">{pending.label}</p>
          <p className="text-xs text-muted-foreground">{pending.reason}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => respond(true)} className="btn-danger flex-1">
          Add delete to draft
        </button>
        <button type="button" disabled={busy} onClick={() => respond(false)} className="btn-secondary flex-1">
          Keep it
        </button>
      </div>
    </div>
  );
}

const PROVIDER_NAMES = { anthropic: 'Anthropic', google: 'Google', openai: 'OpenAI' };
const price = (n) => `$${Number(n).toFixed(Number(n) < 1 ? 2 : 0)}`;

/**
 * The model the assistant uses, as a small menu like other chat apps: the current
 * model on a button; the list, grouped by provider with each one's price, opens above it.
 */
function ModelPicker({ settings, onError }) {
  const save = useMutation(api.settings.save);
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const current = settings.editorModel;
  const currentValue = `${current.provider}/${current.model}`;
  const models = settings.priceTable
    .filter((p) => p.available !== false && settings.providers.some((x) => x.name === p.provider && x.configured))
    .sort((a, b) => a.provider.localeCompare(b.provider) || (a.name ?? a.model).localeCompare(b.name ?? b.model));
  const currentName = models.find((m) => `${m.provider}/${m.model}` === currentValue)?.name ?? current.model;

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!box.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    box.current?.querySelector('[aria-selected="true"]')?.focus();
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const choose = async (m) => {
    setOpen(false);
    const next = { provider: m.provider, model: m.model };
    if (`${next.provider}/${next.model}` === currentValue) return;
    const reviewerFollows = settings.reviewerModel.provider === current.provider && settings.reviewerModel.model === current.model;
    try {
      await run(() => save({ editorModel: next, ...(reviewerFollows ? { reviewerModel: next } : {}) }));
    } catch (err) {
      onError(err.message);
    }
  };

  // Up and down move between models, Escape closes.
  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      box.current?.querySelector('button[aria-haspopup]')?.focus();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const options = [...box.current.querySelectorAll('[role="option"]')];
    const at = options.indexOf(document.activeElement);
    options[(at + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus();
  };

  if (models.length === 0) return null;
  const groups = [...new Set(models.map((m) => m.provider))];
  return (
    <div ref={box} className="relative" onKeyDown={onKeyDown}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`AI model: ${currentName}`}
        data-value={currentValue}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 max-w-40 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <span className="truncate">{currentName}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 bottom-full z-20 mb-2 w-64 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl">
          <div role="listbox" aria-label="AI model" className="max-h-72 overflow-y-auto p-1.5">
            {groups.map((provider) => (
              <div key={provider} role="group" aria-label={PROVIDER_NAMES[provider] ?? provider}>
                <p className="px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{PROVIDER_NAMES[provider] ?? provider}</p>
                {models
                  .filter((m) => m.provider === provider)
                  .map((m) => {
                    const value = `${m.provider}/${m.model}`;
                    const selected = value === currentValue;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        data-value={value}
                        onClick={() => choose(m)}
                        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left outline-none hover:bg-muted focus-visible:bg-muted ${selected ? 'text-foreground' : ''}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{m.name ?? m.model}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {price(m.inputPerMTok)} in · {price(m.outputPerMTok)} out per million tokens
                          </span>
                        </span>
                        {selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
          <Link to="/settings?tab=ai" onClick={() => setOpen(false)} className="block border-t border-border px-4 py-2.5 text-xs font-medium text-primary hover:bg-muted">
            Manage models and keys
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ChatPane({ threadId, draft, sent, outcome, closedNotice, changes, step, onShowChange, prompt, onPrompt, messages, selected, onRemoveSelected, picking, onTogglePick, onSend, onNewChat, showToast }) {
  const settings = useQuery(api.settings.get);
  const stop = useMutation(api.chat.stop);
  const text = prompt;
  const setText = onPrompt;
  const textarea = useRef(null);
  const [sending, setSending] = useState(false);
  const [pictures, setPictures] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);
  const endRef = useRef(null);

  const lastId = messages?.at(-1)?.id;
  const statusLine = draft?.running ? STATUS_TEXT[draft.status] : null;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [lastId, statusLine, draft?.pendingConfirm, draft?.notice]);

  const busy = !!draft && (draft.running || draft.status === 'reviewing');
  const noKey = settings && !settings.providers.some((p) => p.configured);
  const canType = !busy && !sending && !uploading && !draft?.pendingConfirm && !noKey;

  const attach = async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    const room = MAX_PICTURES - pictures.length;
    if (files.length > room) showToast(`You can attach up to ${MAX_PICTURES} pictures to a message.`, 'error');
    if (room <= 0) return;
    setUploading(true);
    try {
      for (const file of files.slice(0, room)) {
        const imageId = await uploadImage(file);
        setPictures((list) => [...list, { imageId, name: file.name }]);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const prompt = text.trim();
    if (!prompt || !canType) return;
    setSending(true);
    setText('');
    try {
      await onSend(prompt, pictures);
      setPictures([]);
    } catch (err) {
      setText(prompt);
      showToast(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const onStop = async () => {
    try {
      await run(() => stop({ changeSetId: draft._id }));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h1 className="flex-1 text-base font-bold text-foreground">AI Assistant</h1>
          <button type="button" onClick={onNewChat} disabled={busy} className="btn-secondary rounded-full px-3 py-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> New chat
          </button>
        </div>
      </div>
      <Progress draft={draft} sent={sent} outcome={outcome} />

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-4" aria-live="polite">
        {!threadId || messages?.length === 0 ? (
          <Welcome
            onPick={(starter) => {
              setText(starter);
              requestAnimationFrame(() => {
                textarea.current?.focus();
                textarea.current?.setSelectionRange(starter.length, starter.length);
              });
            }}
          />
        ) : (
          mergeSteps(messages ?? []).map((m) => <Message key={m.id} message={m} />)
        )}

        {statusLine && (
          <p className="flex items-center gap-2 px-4 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> {statusLine}
          </p>
        )}

        <div className="space-y-3 px-4">
          {draft?.pendingConfirm && <ConfirmCard draft={draft} onError={(m) => showToast(m, 'error')} />}

          {draft?.status === 'needs_admin' && draft.review?.verdict === 'rejected' && (
            <div role="alert" className="space-y-2 rounded-xl border border-warning/50 bg-warning/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" /> The review agent objects
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                {draft.review.reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">It's your decision: tell the assistant what to do, send it to the Versions page anyway, or discard the draft.</p>
            </div>
          )}

          {changes.length > 0 && (draft || sent) && <ChangeCards changes={changes} step={step} onShow={onShowChange} />}

          {sent && (
            <div role="status" className="space-y-3 rounded-xl border border-success/40 bg-success/10 p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {changes.length > 1 ? `${changes.length} changes are` : 'Your change is'} waiting for your approval
                </p>
                <p className="text-xs text-muted-foreground">The review agent checked it. Nothing is on the website until you approve it on Versions.</p>
              </div>
              <Link to="/versions?tab=pending" className="btn-primary w-full justify-center rounded-full px-4 py-2 text-xs">
                Review on Versions
              </Link>
            </div>
          )}

          {(draft?.notice || closedNotice) && (
            <p role="status" className="rounded-xl border border-border bg-muted p-3 text-sm text-foreground">
              {draft?.notice || closedNotice}
            </p>
          )}
        </div>
        <div ref={endRef} />
      </div>

      {noKey ? (
        <p className="shrink-0 border-t border-border p-4 text-sm text-foreground">
          Add an API key on the{' '}
          <Link to="/settings?tab=ai" className="font-semibold underline">
            Settings
          </Link>{' '}
          page (AI model config) to start.
        </p>
      ) : (
        <form onSubmit={submit} className="shrink-0 space-y-2 border-t border-border p-3">
          {selected.length > 0 && (
            <ul aria-label="What you're pointing at" className="max-h-28 space-y-1 overflow-y-auto">
              {selected.map((item, i) => (
                <li key={`${item.path} ${item.selector}`} className="flex items-center gap-2 rounded-lg bg-accent px-2.5 py-1.5 text-xs text-accent-foreground">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {item.text?.split('\n')[0] || item.tag} <span className="opacity-70">({item.path})</span>
                  </span>
                  <button type="button" onClick={() => onRemoveSelected(item)} aria-label={`Stop pointing at item ${i + 1}`} className="shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {pictures.length > 0 && (
            <ul aria-label="Attached pictures" className="space-y-1">
              {pictures.map((p, i) => (
                <li key={p.imageId} className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-xs text-foreground">
                  <ImagePlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <button type="button" onClick={() => setPictures((list) => list.filter((_, j) => j !== i))} aria-label={`Remove ${p.name}`} className="shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {picking && <p className="text-xs text-muted-foreground">Click each thing in the preview; click again to remove it. Ctrl-click follows a link to another page.</p>}
          {/* One box, as in modern chat apps: the message, then its tools along the bottom. */}
          <div className={`rounded-2xl border bg-background transition-shadow focus-within:border-primary/60 focus-within:ring-3 focus-within:ring-primary/15 ${canType ? 'border-input' : 'border-border opacity-80'}`}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) submit(e);
              }}
              ref={textarea}
              rows={3}
              disabled={!canType}
              placeholder={draft?.pendingConfirm ? 'Answer the question above first.' : busy ? 'Please wait…' : 'Say what should change, e.g. “Change the home page heading to Where ideas become companies”'}
              aria-label="Message to the AI Assistant"
              className="block w-full resize-none border-0 bg-transparent px-3.5 pt-3 pb-1 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            />
            <div className="flex items-center gap-1 px-2 pb-2">
              <button
                type="button"
                onClick={onTogglePick}
                aria-pressed={picking}
                aria-label={picking ? 'Done pointing' : selected.length ? 'Point at more' : 'Point at something'}
                title="Point: click things on the website to show what you mean"
                className={`flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors ${
                  picking ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Crosshair className="h-4 w-4" aria-hidden="true" />
                <span>{picking ? 'Done' : 'Point'}</span>
              </button>
              <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={attach} aria-label="Attach pictures" />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading || !canType}
                title="Attach a picture"
                aria-label="Attach a picture"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              </button>
              <span className="flex-1" />
              {settings && <ModelPicker settings={settings} onError={(m) => showToast(m, 'error')} />}
              <SpendMeter compact />
              {draft?.running ? (
                <button type="button" onClick={onStop} aria-label="Stop" title="Stop" className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90">
                  <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!canType || !text.trim()}
                  aria-label="Send"
                  title="Send (Enter)"
                  className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
