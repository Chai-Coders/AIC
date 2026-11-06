import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAction, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { Loader2, RotateCcw } from 'lucide-react';
import { run } from '../services/convex';

const api = anyApi.ai;

const when = (ms) => new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const KIND = { content: 'Content', code: 'Code', mixed: 'Code and content' };

function statusOf(v) {
  if (v.status === 'content_pending') return 'Waiting for deploy';
  if (v.status === 'failed') return 'Partly published';
  if (v.rolledBack) return 'Rolled back';
  if (v.isRollback) return 'Rollback';
  return 'Live';
}

export default function AiHistoryPage() {
  const { showToast } = useOutletContext();
  const versions = useQuery(api.versions.list);
  const log = useQuery(api.audit.list, { limit: 100 });
  const rollback = useAction(api.versions.rollback);
  const [busy, setBusy] = useState(null);

  const onRollback = async (v) => {
    if (!window.confirm(`Undo this publish?\n\n${v.summary}`)) return;
    setBusy(v.id);
    try {
      await run(() => rollback({ versionId: v.id }));
      showToast('Rolled back.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">AI history</h1>
        <p className="text-sm text-muted-foreground">Everything the AI Assistant has published, with one-click undo, and a log of what it did.</p>
      </div>

      <section className="space-y-3 rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-foreground">Published versions</h2>
        {versions === undefined && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />}
        {versions?.length === 0 && <p className="text-sm text-muted-foreground">Nothing has been published yet.</p>}
        <ul className="divide-y divide-border">
          {versions?.map((v) => (
            <li key={v.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm break-words text-foreground">{v.summary}</p>
                <p className="text-xs text-muted-foreground">
                  {when(v.publishedAt)} · {KIND[v.kind]} · {statusOf(v)}
                  {v.commitSha && (
                    <>
                      {' · '}
                      <span className="font-mono">{v.commitSha.slice(0, 7)}</span>
                    </>
                  )}
                  {v.files.length > 0 && ` · ${v.files.length} file${v.files.length === 1 ? '' : 's'}`}
                  {v.records > 0 && ` · ${v.records} record${v.records === 1 ? '' : 's'}`}
                </p>
                {v.error && <p className="text-xs text-destructive">{v.error}</p>}
              </div>
              {!v.rolledBack && v.status !== 'content_pending' && (
                <button type="button" onClick={() => onRollback(v)} disabled={busy !== null} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
                  {busy === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  Roll back
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-foreground">Activity log</h2>
        <p className="text-sm text-muted-foreground">Every prompt, tool call, review verdict, publish and rollback. Most recent first.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1.5 pr-4 font-medium">When</th>
                <th className="py-1.5 pr-4 font-medium">What</th>
                <th className="py-1.5 pr-4 font-medium">Details</th>
                <th className="py-1.5 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {log?.map((row) => (
                <tr key={row._id} className="border-t border-border align-top">
                  <td className="py-1.5 pr-4 whitespace-nowrap text-muted-foreground">{when(row.at)}</td>
                  <td className="py-1.5 pr-4 font-mono whitespace-nowrap text-foreground">{row.action}</td>
                  <td className="max-w-md truncate py-1.5 pr-4 font-mono text-muted-foreground" title={JSON.stringify(row.detail)}>
                    {row.detail ? JSON.stringify(row.detail) : ''}
                  </td>
                  <td className="py-1.5 text-right whitespace-nowrap tabular-nums text-muted-foreground">{row.costUsd ? `$${row.costUsd.toFixed(4)}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
