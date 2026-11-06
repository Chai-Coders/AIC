import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { AlertTriangle, Bot, Crosshair, Loader2, Plus, Send, Square, Trash2, X } from 'lucide-react';
import { run } from '../../services/convex';
import SpendMeter from './SpendMeter';

const api = anyApi.ai;

// What the agent is doing, in the admin's words.
const TOOL_LABELS = {
  get_site_content: 'Read the site content',
  get_site_text: 'Read the website text',
  update_site_text: 'Edited the website text in the draft',
  search_media: 'Looked through the media library',
  search_code: 'Searched the website code',
  read_file: 'Read part of the website code',
  get_selected_element: 'Looked at the element you pointed to',
  update_record: 'Edited a record in the draft',
  create_record: 'Added a record to the draft',
  delete_record: 'Asked to delete a record',
  swap_media: 'Swapped a picture in the draft',
  reorder: 'Changed the order in the draft',
  edit_file: 'Edited the code in the draft',
  create_file: 'Added a file to the draft',
  delete_file: 'Asked to delete a file',
  describe_change: 'Noted the change',
};

const STATUS_TEXT = {
  drafting: 'Working on your request…',
  building: 'Checking that the change builds in the preview…',
  reviewing: 'The review agent is checking the change…',
};

function Message({ message }) {
  if (message.role === 'note') {
    return (
      <p className="mx-4 rounded-lg bg-muted px-3 py-2 text-xs whitespace-pre-wrap text-muted-foreground">{message.text}</p>
    );
  }
  if (message.role === 'user') {
    const text = message.text.split('\n\n(The admin pointed at an element')[0];
    return (
      <div className="flex justify-end px-4">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap text-primary-foreground">{text}</p>
      </div>
    );
  }
  const activity = [...new Set(message.tools.map((t) => TOOL_LABELS[t]).filter(Boolean))];
  return (
    <div className="space-y-1 px-4">
      {activity.map((line) => (
        <p key={line} className="text-xs text-muted-foreground">
          · {line}
        </p>
      ))}
      {message.text && <p className="text-sm whitespace-pre-wrap text-foreground">{message.text}</p>}
      {message.failed && <p className="text-xs text-destructive">This step failed.</p>}
    </div>
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
            Delete {pending.kind === 'delete_file' ? 'this file' : 'this record'}?
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

function ModelPicker({ settings, onError }) {
  const save = useMutation(api.settings.save);
  const current = settings.editorModel;
  const models = settings.priceTable.filter((p) => settings.providers.some((x) => x.name === p.provider && x.configured));
  const change = async (e) => {
    const [provider, ...rest] = e.target.value.split('/');
    const next = { provider, model: rest.join('/') };
    const reviewerFollows = settings.reviewerModel.provider === current.provider && settings.reviewerModel.model === current.model;
    try {
      await run(() => save({ editorModel: next, ...(reviewerFollows ? { reviewerModel: next } : {}) }));
    } catch (err) {
      onError(err.message);
    }
  };
  if (models.length === 0) return null;
  return (
    <select value={`${current.provider}/${current.model}`} onChange={change} className="field py-1.5 text-xs" aria-label="AI model">
      {!models.some((m) => m.provider === current.provider && m.model === current.model) && (
        <option value={`${current.provider}/${current.model}`}>{current.model}</option>
      )}
      {models.map((m) => (
        <option key={`${m.provider}/${m.model}`} value={`${m.provider}/${m.model}`}>
          {m.model}
        </option>
      ))}
    </select>
  );
}

export default function ChatPane({ threadId, draft, closedNotice, messages, selected, onClearSelected, picking, onTogglePick, onSend, onNewChat, showToast }) {
  const settings = useQuery(api.settings.get);
  const stop = useMutation(api.chat.stop);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const lastId = messages?.at(-1)?.id;
  const statusLine = draft && (draft.running || draft.status === 'building') ? STATUS_TEXT[draft.status] : null;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [lastId, statusLine, draft?.pendingConfirm, draft?.notice]);

  const busy = !!draft && (draft.running || ['publishing', 'building', 'reviewing'].includes(draft.status));
  const noKey = settings && !settings.providers.some((p) => p.configured);
  const canType = !busy && !sending && !draft?.pendingConfirm && !noKey;

  const submit = async (e) => {
    e.preventDefault();
    const prompt = text.trim();
    if (!prompt || !canType) return;
    setSending(true);
    setText('');
    try {
      await onSend(prompt);
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
      <div className="shrink-0 space-y-2 border-b border-border p-3">
        <div className="flex items-center gap-2">
          <h1 className="flex-1 text-sm font-semibold text-foreground">AI Assistant</h1>
          <button type="button" onClick={onNewChat} disabled={busy} className="btn-ghost px-2 py-1 text-xs">
            <Plus className="h-3.5 w-3.5" /> New chat
          </button>
        </div>
        {settings && <ModelPicker settings={settings} onError={(m) => showToast(m, 'error')} />}
        <SpendMeter compact />
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-4" aria-live="polite">
        {!threadId || messages?.length === 0 ? (
          <div className="space-y-3 px-4 py-6 text-center">
            <Bot className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-foreground">Describe what you'd like to change on the website.</p>
            <p className="text-xs text-muted-foreground">
              For example: "Change the home page heading to Who we are", or "Move the newest startups to the top". Nothing goes live until you press
              Publish.
            </p>
          </div>
        ) : (
          messages?.map((m) => <Message key={m.id} message={m} />)
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
              <p className="text-xs text-muted-foreground">It's your decision: tell the assistant what to do, publish anyway, or discard the draft.</p>
            </div>
          )}

          {draft?.buildError && (
            <div role="alert" className="space-y-1.5 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
              <p className="text-sm font-semibold text-foreground">The change doesn't build</p>
              <pre className="overflow-x-auto font-mono text-xs whitespace-pre-wrap text-muted-foreground">{draft.buildError}</pre>
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
          <Link to="/ai/settings" className="font-semibold underline">
            AI settings
          </Link>{' '}
          page to start.
        </p>
      ) : (
        <form onSubmit={submit} className="shrink-0 space-y-2 border-t border-border p-3">
          {selected && (
            <div className="flex items-center gap-2 rounded-lg bg-accent px-2.5 py-1.5 text-xs text-accent-foreground">
              <Crosshair className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">
                Pointing at: {selected.text?.split('\n')[0] || selected.tag} ({selected.path})
              </span>
              <button type="button" onClick={onClearSelected} aria-label="Stop pointing at this" className="shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) submit(e);
            }}
            rows={3}
            disabled={!canType}
            placeholder={draft?.pendingConfirm ? 'Answer the question above first.' : busy ? 'Please wait…' : 'What should change?'}
            aria-label="Message to the AI Assistant"
            className="field resize-none"
          />
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={onTogglePick} aria-pressed={picking} className={`btn-secondary px-3 py-1.5 text-xs ${picking ? 'ring-3 ring-primary/40' : ''}`}>
              <Crosshair className="h-3.5 w-3.5" /> {picking ? 'Click something in the preview' : 'Point at something'}
            </button>
            {draft?.running || draft?.status === 'building' ? (
              <button type="button" onClick={onStop} className="btn-secondary px-3 py-1.5 text-xs">
                <Square className="h-3.5 w-3.5" /> Stop
              </button>
            ) : (
              <button type="submit" disabled={!canType || !text.trim()} className="btn-primary px-3 py-1.5 text-xs">
                <Send className="h-3.5 w-3.5" /> Send
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
