import { useMemo, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Clock, History, Info, RotateCcw, Undo2 } from 'lucide-react';
import ChangeCard, { Badge } from '../components/versions/ChangeCard';
import ConfirmModal from '../components/ConfirmModal';
import { run } from '../services/convex';
import { formatDateTime, formatTime, groupByRecord, plural, versionLook, versionSubtitle, versionTitle } from '../lib/versions';

function Notice({ icon: Icon = Info, tone = 'info', children }) {
  const tones = {
    info: 'border-primary/20 bg-accent text-accent-foreground',
    warning: 'border-warning/30 bg-warning/10 text-foreground',
    muted: 'border-border bg-muted text-muted-foreground',
  };
  return (
    <div className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm ${tones[tone]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function when(version) {
  if (version.source === 'mcp') {
    const decided = version.decidedAt ? formatDateTime(version.decidedAt) : '';
    if (version.status === 'rejected') return `Proposed by ${version.app || 'an AI app'} · rejected ${decided}`;
    return `Proposed by ${version.app || 'an AI app'} · approved ${decided}`;
  }
  if (version.source === 'rollback') return `Applied ${formatDateTime(version.createdAt)}`;
  const start = formatDateTime(version.createdAt);
  const sameMinute = Math.abs(version.lastEditAt - version.createdAt) < 60000;
  return `Saved in the CMS · ${sameMinute ? start : `${start} – ${formatTime(version.lastEditAt)}`}`;
}

function ActionCard({ icon: Icon, title, description, disabledReason, onClick, to }) {
  const className = `flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all ${
    disabledReason ? 'cursor-not-allowed opacity-60' : 'hover:border-primary/40 hover:shadow-md'
  }`;
  const body = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 space-y-0.5">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-[13px] text-muted-foreground">{disabledReason || description}</span>
      </span>
    </>
  );
  if (disabledReason) return <div className={className} aria-disabled="true">{body}</div>;
  if (to) return <Link to={to} className={className}>{body}</Link>;
  return <button type="button" onClick={onClick} className={className}>{body}</button>;
}

export default function VersionDetailPage() {
  const { versionId } = useParams();
  const { showToast } = useOutletContext();
  const version = useQuery(anyApi.versions.get, { versionId });
  const undoVersion = useMutation(anyApi.versions.undoVersion);
  const revertChange = useMutation(anyApi.versions.revertChange);

  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirm, setConfirm] = useState(null); // { type: 'undo' } | { type: 'putBack', change }
  const [busy, setBusy] = useState(false);

  const groups = useMemo(() => groupByRecord(version?.changes ?? []), [version]);
  const undoable = useMemo(() => (version?.changes ?? []).filter((c) => c.canUndo), [version]);

  if (version === undefined) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
      </div>
    );
  }
  if (version === null) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-xl border border-border bg-card p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="font-semibold text-foreground">This version can’t be found</h1>
        <Link to="/versions?tab=history" className="btn-primary">Back to all versions</Link>
      </div>
    );
  }

  const { Icon, tone, label } = versionLook(version);

  const startUndo = () => {
    // Fields changed again later are left unticked; the admin can tick them.
    setSelectedIds(new Set(undoable.filter((c) => !c.laterEditAt).map((c) => c.id)));
    setSelecting(true);
  };
  const toggle = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const report = (result, done) => {
    if (result.applied > 0) showToast(`${done} It is saved as a new version, so you can undo it too.`, 'success');
    if (result.skipped.length > 0) {
      showToast(`${plural(result.skipped.length, 'change')} skipped: ${[...new Set(result.skipped)].join(' ')}`, 'warning');
    }
  };

  const handleConfirm = async () => {
    setBusy(true);
    try {
      if (confirm.type === 'undo') {
        const result = await run(() => undoVersion({ versionId: version.id, changeIds: [...selectedIds] }));
        report(result, `Undid ${plural(result.applied, 'change')}.`);
        setSelecting(false);
      } else {
        const result = await run(() => revertChange({ changeId: confirm.change.id }));
        report(result, `${confirm.change.fieldLabel} is back to how it was.`);
      }
      setConfirm(null);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const isLatest = !version.newerId;
  const putBack = confirm?.type === 'putBack' ? confirm.change : null;

  return (
    <div className="space-y-6 pb-28">
      <Link to="/versions?tab=history" className="btn-ghost -ml-3 px-3">
        <ArrowLeft className="h-4 w-4" />
        <span>All versions</span>
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{versionTitle(version)}</h1>
            <Badge>{label}</Badge>
            {version.editingNow && <Badge className="bg-success/15 text-success">Editing now</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{versionSubtitle(version)}</p>
          <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {when(version)} · {plural(version.changeCount, 'change')}
          </p>
        </div>
      </div>

      {version.note && (
        <blockquote className="rounded-lg border-l-4 border-primary/40 bg-muted/60 px-4 py-3 text-sm text-foreground">
          {version.note}
        </blockquote>
      )}

      {/* What happened since */}
      <div className="space-y-2">
        {version.editingNow && (
          <Notice>You are still editing. Changes you save in the next few minutes are added to this version.</Notice>
        )}
        {version.status === 'rejected' && (
          <Notice tone="muted">This draft was rejected. Nothing in it reached the website.</Notice>
        )}
        {version.reverts && (
          <Notice icon={RotateCcw}>
            This {version.rollbackKind === 'restore' ? 'restored the website to' : 'undid changes from'} the version of{' '}
            <Link to={`/versions/${version.reverts.id}`} className="font-medium underline">
              {formatDateTime(version.reverts.createdAt)}
            </Link>
            .
          </Notice>
        )}
        {version.restoredBy.map((u) => (
          <Notice key={u.id} icon={History}>
            The website was restored to this version on{' '}
            <Link to={`/versions/${u.id}`} className="font-medium underline">
              {formatDateTime(u.createdAt)}
            </Link>
            .
          </Notice>
        ))}
        {version.undoneBy.map((u) => (
          <Notice key={u.id} tone="warning" icon={History}>
            {u.kind === 'revert' ? 'A change here was put back' : 'Changes here were undone'} on{' '}
            <Link to={`/versions/${u.id}`} className="font-medium underline">
              {formatDateTime(u.createdAt)}
            </Link>
            .
          </Notice>
        ))}
        {version.overriddenCount > 0 && (
          <Notice tone="warning">
            {version.overriddenCount === 1 ? '1 change was' : `${version.overriddenCount} changes were`} not applied, because you
            had edited the same field after the AI proposed it. Your edit was kept.
          </Notice>
        )}
      </div>

      {/* Actions */}
      {version.applied && !selecting && (
        <div className="grid gap-3 sm:grid-cols-2">
          <ActionCard
            icon={Undo2}
            title="Undo these changes"
            description="Put back what this version changed. Everything else stays as it is."
            disabledReason={undoable.length === 0 ? 'Nothing to undo: every field is already back to how it was.' : null}
            onClick={startUndo}
          />
          <ActionCard
            icon={History}
            title="Restore website to this point"
            description="Make the website look exactly as it did right after this version, undoing everything newer."
            disabledReason={isLatest ? 'This is the newest version: the website already looks like this.' : null}
            to={`/versions/${version.id}/restore`}
          />
        </div>
      )}

      {selecting && (
        <Notice>
          Choose the changes to undo. Fields that were changed again later are not ticked, so your newer edits stay. Tick them to
          undo them too.
        </Notice>
      )}

      {/* Changes */}
      <div className="space-y-4">
        {groups.map((group) => (
          <ChangeCard
            key={group.key}
            group={group}
            selectable={selecting}
            selectedIds={selectedIds}
            onToggle={toggle}
            onPutBack={version.applied ? (change) => setConfirm({ type: 'putBack', change }) : null}
          />
        ))}
      </div>

      {/* Older / newer, like stepping through commits */}
      {!selecting && (
        <nav aria-label="Other versions" className="flex justify-between gap-2 border-t border-border pt-4">
          {version.olderId ? (
            <Link to={`/versions/${version.olderId}`} className="btn-ghost px-3">
              <ChevronLeft className="h-4 w-4" />
              <span>Older version</span>
            </Link>
          ) : (
            <span />
          )}
          {version.newerId && (
            <Link to={`/versions/${version.newerId}`} className="btn-ghost px-3">
              <span>Newer version</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </nav>
      )}

      {/* Undo bar */}
      {selecting && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur md:left-64">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6 lg:px-10">
            <button
              type="button"
              onClick={() =>
                setSelectedIds(selectedIds.size === undoable.length ? new Set() : new Set(undoable.map((c) => c.id)))
              }
              className="btn-ghost px-3"
            >
              {selectedIds.size === undoable.length ? 'Unselect all' : 'Select all'}
            </button>
            <span className="text-sm font-medium text-foreground">
              {selectedIds.size} of {undoable.length} selected
            </span>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={() => setSelecting(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setConfirm({ type: 'undo' })}
                disabled={selectedIds.size === 0}
                className="btn-primary"
              >
                <Undo2 className="h-4 w-4" />
                <span>Undo {plural(selectedIds.size, 'change')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => !busy && setConfirm(null)}
        onConfirm={handleConfirm}
        icon={confirm?.type === 'undo' ? Undo2 : RotateCcw}
        title={
          confirm?.type === 'undo'
            ? `Undo ${plural(selectedIds.size, 'change')}?`
            : putBack?.op === 'create'
            ? `Remove “${putBack.itemTitle}” again?`
            : putBack?.op === 'delete'
            ? `Put “${putBack.itemTitle}” back on the website?`
            : `Put back the old ${putBack?.fieldLabel.toLowerCase()}?`
        }
        message={
          <>
            {confirm?.type === 'undo'
              ? 'They go back to how they were before this version. Visitors see this within a minute or two.'
              : 'This is published straight away; visitors see it within a minute or two.'}{' '}
            It is saved as a new version, so you can undo this too.
          </>
        }
        confirmLabel={confirm?.type === 'undo' ? 'Undo changes' : putBack?.op === 'create' ? 'Remove' : 'Put back'}
        busyLabel="Applying…"
        busy={busy}
      >
        {putBack && putBack.kind !== 'record' && putBack.kind !== 'image' && (
          <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-3 text-sm">
            <p className="line-clamp-3">
              <span className="font-medium text-foreground">Now: </span>
              <span className="text-muted-foreground">{putBack.current ?? 'empty'}</span>
            </p>
            <p className="line-clamp-3">
              <span className="font-medium text-foreground">Will be: </span>
              <span className="text-muted-foreground">{putBack.before ?? 'empty'}</span>
            </p>
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}
