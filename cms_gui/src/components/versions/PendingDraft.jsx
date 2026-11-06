import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { AlertCircle, Bot, Check, ImagePlus, Inbox, Loader2, Pencil, ShieldCheck, Trash2, X } from 'lucide-react';
import ValueCompare, { RecordFields } from './ValueCompare';
import { Badge } from './ChangeCard';
import ConfirmModal from '../ConfirmModal';
import { run } from '../../services/convex';
import { uploadImage } from '../../lib/upload';
import { formatDateTime, groupByRecord, plural, timeAgo } from '../../lib/versions';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const PENDING = 'pending:';

/** Checks a picture the admin chose, like the item editor does. */
function checkImage(file) {
  if (!file.type.startsWith('image/')) return 'That file is not an image. Please choose a JPG, PNG or WEBP picture.';
  if (file.size > MAX_IMAGE_BYTES) return `That picture is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Please choose one under 10 MB.`;
  return null;
}

/** Pending pictures used by the ticked changes, as ids. */
function pendingPictureIds(changes) {
  const ids = new Set();
  const add = (value) => typeof value === 'string' && value.startsWith(PENDING) && ids.add(value.slice(PENDING.length));
  for (const change of changes) {
    if (change.skipped) continue;
    if (change.op === 'create') Object.values(change.rawAfter ?? {}).forEach(add);
    else add(change.rawAfter);
  }
  return [...ids];
}

function TextEditor({ kind, label, initial, options, onSave, onCancel }) {
  const [value, setValue] = useState(initial ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(value);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };
  const common = { value, onChange: (e) => setValue(e.target.value), disabled: saving, 'aria-label': label, className: 'field' };
  return (
    <div className="space-y-2">
      {kind === 'textarea' ? (
        <textarea rows={6} {...common} className="field resize-y leading-relaxed" autoFocus />
      ) : kind === 'select' ? (
        <select {...common}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input type={kind === 'url' ? 'url' : 'text'} {...common} autoFocus />
      )}
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-[13px] text-destructive">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving} className="btn-primary px-3 py-1.5 text-[13px]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className="btn-ghost px-3 py-1.5 text-[13px]">
          Cancel
        </button>
      </div>
    </div>
  );
}

/** "Choose a picture" that uploads straight away and hands back the picture id. */
function PictureButton({ label, onUploaded, showToast, primary = false }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const choose = async (file) => {
    if (!file) return;
    const problem = checkImage(file);
    if (problem) return showToast(problem, 'error');
    setBusy(true);
    try {
      await onUploaded(await uploadImage(file));
    } catch (err) {
      showToast(err.message || 'The picture could not be uploaded. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className={`${primary ? 'btn-primary' : 'btn-secondary'} px-3 py-1.5 text-[13px]`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        {busy ? 'Uploading…' : label}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          choose(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </>
  );
}

/** Shows a tick or "use the AI value" choice at once, before the server confirms it. */
const patchChange = (changeId, patch) => (store) => {
  const draft = store.getQuery(anyApi.drafts.get, {});
  if (!draft) return;
  store.setQuery(anyApi.drafts.get, {}, {
    ...draft,
    changes: draft.changes.map((c) => (c.id === changeId ? { ...c, ...patch } : c)),
  });
};

function DraftChange({ change, showToast }) {
  const setIncluded = useMutation(anyApi.drafts.setIncluded).withOptimisticUpdate((store, { changeId, included }) =>
    patchChange(changeId, { skipped: !included })(store)
  );
  const setForce = useMutation(anyApi.drafts.setForce).withOptimisticUpdate((store, { changeId, force }) =>
    patchChange(changeId, { force })(store)
  );
  const editValue = useMutation(anyApi.drafts.editValue);
  const [editing, setEditing] = useState(null); // field key being edited
  const [busy, setBusy] = useState(false);

  const included = !change.skipped;
  const keptLive = change.overriddenNow && !change.force;
  const greyed = !included || keptLive;

  const act = async (call) => {
    setBusy(true);
    try {
      await run(call);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const saveValue = async (value, field) => {
    await run(() => editValue({ changeId: change.id, value, ...(field ? { field } : {}) }));
    setEditing(null);
  };

  return (
    <div className="flex gap-3 border-t border-border px-4 py-4 first:border-t-0 sm:px-5">
      <input
        type="checkbox"
        checked={included}
        onChange={() => act(() => setIncluded({ changeId: change.id, included: !included }))}
        aria-label={`Include ${change.fieldLabel}`}
        className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-primary"
      />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{change.fieldLabel}</span>
          {!included && <Badge>Left out</Badge>}
          {change.editable && included && editing !== change.field && (
            <button type="button" onClick={() => setEditing(change.field)} className="btn-ghost ml-auto px-2 py-1 text-[13px]">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
        </div>

        {change.overriddenNow && included && (
          <div className="flex flex-col gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-[13px] text-foreground sm:flex-row sm:items-center">
            <p className="flex-1">
              {change.force
                ? 'You edited this field after the AI proposed it. The AI value will replace your edit.'
                : `You edited this field on ${formatDateTime(change.laterEditAt)}, after the AI proposed it. Your edit will be kept.`}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => act(() => setForce({ changeId: change.id, force: !change.force }))}
              className="btn-secondary shrink-0 px-3 py-1.5 text-[13px]"
            >
              {change.force ? 'Keep my edit' : 'Use the AI value instead'}
            </button>
          </div>
        )}

        {change.kind === 'record' ? (
          change.op === 'create' ? (
            <div className={`space-y-3 ${greyed ? 'opacity-60' : ''}`}>
              <p className="text-[13px] text-muted-foreground">Will be added to the website with:</p>
              {editing === '' ? (
                <div className="space-y-4 rounded-lg border border-border p-3">
                  {change.rawFields
                    .filter((f) => f.kind !== 'image')
                    .map((f) => (
                      <div key={f.key} className="space-y-1.5">
                        <p className="text-sm font-medium text-foreground">{f.label}</p>
                        <TextEditor
                          kind={f.kind}
                          label={f.label}
                          initial={f.value}
                          options={f.options}
                          onSave={(value) => saveValue(value, f.key).then(() => setEditing(''))}
                          onCancel={() => setEditing(null)}
                        />
                      </div>
                    ))}
                </div>
              ) : (
                <RecordFields fields={change.fields} side="after" />
              )}
              {included && (
                <div className="flex flex-wrap gap-2">
                  {editing !== '' && (
                    <button type="button" onClick={() => setEditing('')} className="btn-ghost px-3 py-1.5 text-[13px]">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit details
                    </button>
                  )}
                  {editing === '' && (
                    <button type="button" onClick={() => setEditing(null)} className="btn-ghost px-3 py-1.5 text-[13px]">
                      Done editing
                    </button>
                  )}
                  {change.rawFields
                    .filter((f) => f.kind === 'image')
                    .map((f) => (
                      <PictureButton
                        key={f.key}
                        label={f.value ? `Change ${f.label.toLowerCase()}` : `Add ${f.label.toLowerCase()}`}
                        primary={change.missing.some((m) => m.key === f.key)}
                        showToast={showToast}
                        onUploaded={(imageId) => saveValue(imageId, f.key)}
                      />
                    ))}
                </div>
              )}
              {included && change.missing.length > 0 && (
                <p className="flex items-center gap-1.5 text-[13px] font-medium text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Needs {change.missing.map((m) => `a ${m.label.toLowerCase()}`).join(' and ')} before it can be approved.
                </p>
              )}
            </div>
          ) : (
            <div className={greyed ? 'opacity-60' : ''}>
              <p className="mb-3 text-[13px] font-medium text-destructive">Will be deleted from the website. It has:</p>
              <RecordFields fields={change.fields} side="before" />
            </div>
          )
        ) : editing === change.field ? (
          <TextEditor
            kind={change.kind}
            label={change.fieldLabel}
            initial={change.rawAfter ?? ''}
            options={change.options}
            onSave={(value) => saveValue(value)}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <>
            <ValueCompare
              kind={change.kind}
              before={change.isNew ? null : change.current}
              after={change.after}
              beforeLabel="Live now"
              afterLabel="Proposed"
              muted={greyed}
            />
            {change.kind === 'image' && included && (
              <PictureButton
                label="Use a different picture"
                showToast={showToast}
                onUploaded={(imageId) => saveValue(imageId)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function PendingDraft() {
  const { showToast } = useOutletContext();
  const navigate = useNavigate();
  const draft = useQuery(anyApi.drafts.get);
  const approve = useMutation(anyApi.drafts.approve);
  const reject = useMutation(anyApi.drafts.reject);
  const [confirm, setConfirm] = useState(null); // 'approve' | 'reject'
  const [busy, setBusy] = useState(null); // progress text while working

  const groups = useMemo(() => groupByRecord(draft?.changes ?? []), [draft]);

  if (draft === undefined) {
    return <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />;
  }
  if (draft === null || draft.changes.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-3 rounded-xl border border-dashed border-input p-10 text-center">
        <Inbox className="mx-auto h-10 w-10 text-muted-foreground/60" />
        <h2 className="font-semibold text-foreground">Nothing waiting for approval</h2>
        <p className="text-sm text-muted-foreground">
          When you ask a connected AI app to change the website, its changes wait here until you approve them.
        </p>
        <Link to="/ai-connection" className="btn-secondary">
          <Bot className="h-4 w-4" />
          Connect an AI app
        </Link>
      </div>
    );
  }

  const included = draft.changes.filter((c) => !c.skipped);
  const toApply = included.filter((c) => !(c.overriddenNow && !c.force));
  const missing = included.filter((c) => c.missing.length > 0);
  const blocked =
    missing.length > 0
      ? `Add the missing ${missing.length === 1 ? 'picture' : 'pictures'} first.`
      : included.length === 0
      ? 'Tick at least one change.'
      : null;

  const handleApprove = async () => {
    try {
      // The browser makes the resized copies of new pictures, as in the editor.
      const ids = pendingPictureIds(draft.changes);
      const images = [];
      for (const [index, id] of ids.entries()) {
        setBusy(`Preparing pictures (${index + 1} of ${ids.length})…`);
        const url = draft.pendingImages.find((p) => p.id === id)?.url;
        if (!url) throw new Error('A picture in this draft is missing. Ask the AI to add it again.');
        const response = await fetch(url);
        if (!response.ok) throw new Error('A picture in this draft could not be loaded. Please try again.');
        images.push({ pendingId: id, imageId: await uploadImage(await response.blob()) });
      }
      setBusy('Publishing…');
      const seen = draft.changes.map((c) => ({ id: c.id, editedAt: c.editedAt }));
      const result = await run(() => approve({ draftId: draft.id, seen, images }));
      showToast(
        result.kept > 0
          ? `Published ${plural(result.applied, 'change')}. ${plural(result.kept, 'field')} kept your newer edit.`
          : `Published ${plural(result.applied, 'change')}. Visitors will see them within a minute or two.`,
        'success'
      );
      setConfirm(null);
      navigate(`/versions/${result.versionId}`);
    } catch (err) {
      showToast(err.message || 'Could not publish. Please try again.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async () => {
    setBusy('Rejecting…');
    try {
      await run(() => reject({ draftId: draft.id }));
      showToast('The draft was rejected. Nothing on the website changed.', 'success');
      setConfirm(null);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Bot className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {plural(draft.changes.length, 'change')} proposed by {draft.app || 'an AI app'}
          </p>
          <p className="text-[13px] text-muted-foreground">
            Started {timeAgo(draft.createdAt)} · last change {timeAgo(draft.lastEditAt)}
          </p>
          <p className="text-[13px] text-muted-foreground">
            Nothing here is on the website yet. Check each change, untick or edit anything you don’t want, then publish.
          </p>
        </div>
      </div>

      {groups.map((group) => (
        <section key={group.key} className="overflow-hidden rounded-xl border border-border bg-card">
          <header className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-4 py-3 sm:px-5">
            <Badge className="bg-card text-muted-foreground ring-1 ring-border">{group.page}</Badge>
            <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
              {group.changes[0].isNew ? `New ${group.noun}: ${group.itemTitle}` : group.itemTitle}
            </h3>
          </header>
          {group.changes.map((change) => (
            <DraftChange key={change.id} change={change} showToast={showToast} />
          ))}
        </section>
      ))}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6 lg:px-10">
          {/* On phones the summary gets its own line above the buttons. */}
          <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
            <p className="text-sm font-medium text-foreground">
              {plural(toApply.length, 'change')} will go live
            </p>
            {blocked && <p className="text-[13px] text-destructive">{blocked}</p>}
          </div>
          <button
            type="button"
            onClick={() => setConfirm('reject')}
            disabled={!!busy}
            className="btn-ghost ml-auto px-3 text-destructive hover:bg-destructive/10 hover:text-destructive sm:ml-0"
          >
            <X className="h-4 w-4" />
            Reject all
          </button>
          <button type="button" onClick={() => setConfirm('approve')} disabled={!!blocked || !!busy} className="btn-primary">
            <ShieldCheck className="h-4 w-4" />
            Approve and publish
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirm === 'approve'}
        onClose={() => !busy && setConfirm(null)}
        onConfirm={handleApprove}
        icon={ShieldCheck}
        title={`Publish ${plural(toApply.length, 'change')}?`}
        message="They are published straight away (visitors see them within a minute or two) and saved as a new version, so you can undo them later from History."
        confirmLabel="Publish"
        busyLabel={busy ?? 'Publishing…'}
        busy={!!busy}
      />
      <ConfirmModal
        isOpen={confirm === 'reject'}
        onClose={() => !busy && setConfirm(null)}
        onConfirm={handleReject}
        icon={Trash2}
        tone="danger"
        title="Reject every change in this draft?"
        message="Nothing on the website changes. The draft stays in History as rejected."
        confirmLabel="Reject all"
        busyLabel="Rejecting…"
        busy={!!busy}
      />
    </div>
  );
}
