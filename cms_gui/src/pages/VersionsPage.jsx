import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { ChevronRight, History, Loader2 } from 'lucide-react';
import PendingDraft from '../components/versions/PendingDraft';
import { Badge } from '../components/versions/ChangeCard';
import { plural, timeAgo, versionLook, versionSubtitle, versionTitle } from '../lib/versions';

const FILTERS = [
  { value: 'all', label: 'Everything' },
  { value: 'cms', label: 'CMS edits' },
  { value: 'mcp', label: 'AI changes' },
  { value: 'rollback', label: 'Undos' },
  { value: 'rejected', label: 'Rejected' },
];

function dayLabel(ms) {
  const day = new Date(ms);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (day.toDateString() === today.toDateString()) return 'Today';
  if (day.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return day.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function VersionEntry({ version, isLatest }) {
  const { Icon, tone } = versionLook(version);
  return (
    <li className="group relative pl-12">
      {/* The line of the history */}
      <span aria-hidden="true" className="absolute bottom-0 left-[17px] top-0 w-px bg-border group-last:hidden" />
      <span
        aria-hidden="true"
        className={`absolute left-0 top-4 flex h-9 w-9 items-center justify-center rounded-full ring-4 ring-background ${tone}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <Link
        to={`/versions/${version.id}`}
        className="group/card mb-3 flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 truncate text-sm font-semibold text-foreground">{versionTitle(version)}</p>
            {version.editingNow && <Badge className="bg-success/15 text-success">Editing now</Badge>}
            {isLatest && !version.editingNow && version.status !== 'rejected' && (
              <Badge className="bg-primary/10 text-primary">Live now</Badge>
            )}
            {version.undoneBy.length > 0 && <Badge className="bg-warning/15 text-warning">Undone</Badge>}
          </div>
          <p className="truncate text-[13px] text-muted-foreground">
            {version.note ? `${version.note} · ` : ''}
            {versionSubtitle(version)}
          </p>
          <p className="text-xs text-muted-foreground">
            {timeAgo(version.lastEditAt)} · {plural(version.changeCount, 'change')}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover/card:translate-x-0.5" />
      </Link>
    </li>
  );
}

function HistoryList() {
  const [filter, setFilter] = useState('all');
  const { results, status, loadMore } = usePaginatedQuery(anyApi.versions.list, { filter }, { initialNumItems: 25 });

  // Group the timeline by day.
  const days = [];
  for (const version of results) {
    const label = dayLabel(version.lastEditAt);
    if (days.at(-1)?.label !== label) days.push({ label, versions: [] });
    days.at(-1).versions.push(version);
  }
  const latestId = filter === 'all' ? results.find((v) => v.status !== 'rejected')?.id : null;

  return (
    <div className="space-y-6">
      <div role="radiogroup" aria-label="Show" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="radio"
            aria-checked={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
              filter === f.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {status === 'LoadingFirstPage' && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="ml-12 h-[88px] animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      )}

      {status !== 'LoadingFirstPage' && results.length === 0 && (
        <div className="mx-auto max-w-md space-y-3 rounded-xl border border-dashed border-input p-10 text-center">
          <History className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <h2 className="font-semibold text-foreground">Nothing here yet</h2>
          <p className="text-sm text-muted-foreground">
            {filter === 'all'
              ? 'Every change you save in the CMS will show up here, so you can compare and undo it later.'
              : 'No versions of this kind yet.'}
          </p>
        </div>
      )}

      {days.map((day) => (
        <section key={day.label} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day.label}</h2>
          <ol>
            {day.versions.map((version) => (
              <VersionEntry key={version.id} version={version} isLatest={version.id === latestId} />
            ))}
          </ol>
        </section>
      ))}

      {(status === 'CanLoadMore' || status === 'LoadingMore') && (
        <div className="flex justify-center">
          <button type="button" onClick={() => loadMore(25)} disabled={status === 'LoadingMore'} className="btn-secondary">
            {status === 'LoadingMore' && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Show older versions</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function VersionsPage() {
  const [params, setParams] = useSearchParams();
  const pendingCount = useQuery(anyApi.drafts.pendingCount) ?? 0;
  const tab = params.get('tab') ?? (pendingCount > 0 ? 'pending' : 'history');

  const tabs = [
    { value: 'pending', label: 'Waiting for approval', count: pendingCount },
    { value: 'history', label: 'History' },
  ];

  return (
    <div className="space-y-6 pb-24">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Versions</h1>
        <p className="text-sm text-muted-foreground">
          Every change to the website, newest first. Open one to compare before and after, or to undo it.
        </p>
      </div>

      <div role="tablist" aria-label="Versions" className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setParams({ tab: t.value }, { replace: true })}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === t.value ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold leading-none text-primary-foreground">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'pending' ? <PendingDraft /> : <HistoryList />}
    </div>
  );
}
