import { useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { ArrowLeft, CheckCircle2, History, Loader2 } from 'lucide-react';
import { Badge } from '../components/versions/ChangeCard';
import ValueCompare, { RecordFields } from '../components/versions/ValueCompare';
import ConfirmModal from '../components/ConfirmModal';
import { run } from '../services/convex';
import { formatDateTime, plural, versionTitle } from '../lib/versions';

const KIND_BADGE = {
  update: null,
  delete: { label: 'Will be removed', className: 'bg-destructive/10 text-destructive' },
  recreate: { label: 'Will be put back', className: 'bg-success/15 text-success' },
};

/** Restore the website to how it was right after one version: a preview, then apply. */
export default function RestorePage() {
  const { versionId } = useParams();
  const { showToast } = useOutletContext();
  const navigate = useNavigate();
  const version = useQuery(anyApi.versions.get, { versionId });
  const preview = useQuery(anyApi.versions.restorePreview, version ? { versionId: version.id } : 'skip');
  const restoreTo = useMutation(anyApi.versions.restoreTo);

  // Everything starts ticked. The preview is live; unticked keys that drop
  // out of it are simply ignored.
  const [unticked, setUnticked] = useState(new Set());
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const groups = useMemo(() => {
    const map = new Map();
    for (const item of preview ?? []) {
      const key = item.key.split(':').slice(0, 2).join(':');
      if (!map.has(key)) map.set(key, { key, page: item.page, itemTitle: item.itemTitle, items: [] });
      map.get(key).items.push(item);
    }
    return [...map.values()];
  }, [preview]);

  const selectedKeys = (preview ?? []).map((i) => i.key).filter((k) => !unticked.has(k));
  const toggle = (key) =>
    setUnticked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const handleRestore = async () => {
    setBusy(true);
    try {
      const result = await run(() => restoreTo({ versionId: version.id, keys: selectedKeys }));
      showToast(`Restored ${plural(result.applied, 'change')}. It is saved as a new version, so you can undo it too.`, 'success');
      if (result.skipped.length) showToast(`${plural(result.skipped.length, 'change')} skipped.`, 'warning');
      navigate(result.versionId ? `/versions/${result.versionId}` : '/versions?tab=history');
    } catch (err) {
      showToast(err.message, 'error');
      setBusy(false);
      setConfirming(false);
    }
  };

  const loading = version === undefined || (version && preview === undefined);

  return (
    <div className="space-y-6 pb-28">
      <Link to={`/versions/${versionId}`} className="btn-ghost -ml-3 px-3">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to the version</span>
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Restore website to this point</h1>
        {version && (
          <p className="text-sm text-muted-foreground">
            Makes the website look as it did right after this version ({versionTitle(version)}, {formatDateTime(version.lastEditAt)}).
            Check what will change, and untick anything you want to keep as it is now.
          </p>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-32 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      )}

      {!loading && (!preview || preview.length === 0) && (
        <div className="mx-auto max-w-md space-y-3 rounded-xl border border-dashed border-input p-10 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
          <h2 className="font-semibold text-foreground">Nothing to restore</h2>
          <p className="text-sm text-muted-foreground">The website already looks the way it did after this version.</p>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.key} className="overflow-hidden rounded-xl border border-border bg-card">
          <header className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-4 py-3 sm:px-5">
            <Badge className="bg-card text-muted-foreground ring-1 ring-border">{group.page}</Badge>
            <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{group.itemTitle}</h2>
          </header>
          {group.items.map((item) => {
            const checked = !unticked.has(item.key);
            const badge = KIND_BADGE[item.kind];
            return (
              <label
                key={item.key}
                className="flex cursor-pointer gap-3 border-t border-border px-4 py-4 first:border-t-0 sm:px-5"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(item.key)}
                  className="mt-1 h-4 w-4 shrink-0 accent-primary"
                />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{item.fieldLabel}</span>
                    {badge && <Badge className={badge.className}>{badge.label}</Badge>}
                  </div>
                  {item.fieldKind === 'record' ? (
                    <div className={checked ? '' : 'opacity-60'}>
                      <RecordFields fields={item.fields} side={item.kind === 'delete' ? 'before' : 'after'} />
                    </div>
                  ) : (
                    <ValueCompare
                      kind={item.fieldKind}
                      before={item.current}
                      after={item.target}
                      beforeLabel="Now"
                      afterLabel="After restoring"
                      muted={!checked}
                    />
                  )}
                </div>
              </label>
            );
          })}
        </section>
      ))}

      {preview && preview.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur md:left-64">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6 lg:px-10">
            <span className="basis-full text-sm font-medium text-foreground sm:basis-auto">
              {selectedKeys.length} of {plural(preview.length, 'change')} selected
            </span>
            <div className="ml-auto flex gap-2">
              <Link to={`/versions/${versionId}`} className="btn-secondary">
                Cancel
              </Link>
              <button type="button" onClick={() => setConfirming(true)} disabled={selectedKeys.length === 0} className="btn-primary">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
                <span>Restore {plural(selectedKeys.length, 'change')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirming}
        onClose={() => !busy && setConfirming(false)}
        onConfirm={handleRestore}
        icon={History}
        title={`Restore ${plural(selectedKeys.length, 'change')}?`}
        message="They go live on the website straight away. This is saved as a new version, so you can undo the restore too."
        confirmLabel="Restore"
        busyLabel="Restoring…"
        busy={busy}
      />
    </div>
  );
}
