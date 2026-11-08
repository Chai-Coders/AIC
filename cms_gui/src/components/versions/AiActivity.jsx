import { useState } from 'react';
import { useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { Loader2 } from 'lucide-react';

const api = anyApi.ai;

const when = (ms) => new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const VIEWS = [
  { value: 'important', label: 'What happened' },
  { value: 'requests', label: 'Your requests' },
  { value: 'edits', label: 'Changes made' },
  { value: 'reviews', label: 'Checks' },
  { value: 'sending', label: 'Sent to Versions' },
  { value: 'settings', label: 'Settings' },
  { value: '', label: 'Every step' },
];
const NOUN = { gallery: 'photo', startups: 'startup', news: 'news post', teamMembers: 'person' };
const quote = (value) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return `“${text.length > 80 ? `${text.slice(0, 77)}…` : text}”`;
};

/** One log row in plain words. */
function describe({ action, detail: given }) {
  // Some rows carry no details at all.
  const detail = given ?? {};
  const input = detail.input ?? {};
  const failed = detail.error ? ` (didn't work: ${detail.error})` : '';
  const noun = NOUN[input.table] ?? 'item';
  switch (action) {
    case 'prompt':
      return `You asked: ${quote(detail.prompt)}`;
    case 'tool.update_site_text':
      return `Changed a website text${input.value === null ? ' back to the original' : ` to ${quote(input.value)}`}${failed}`;
    case 'tool.update_record':
      return `Changed a ${noun}'s ${input.field} to ${quote(input.value)}${failed}`;
    case 'tool.add_person':
      return `Added ${quote(input.name)} as a person${failed}`;
    case 'tool.add_startup':
      return `Added the startup ${quote(input.name)}${failed}`;
    case 'tool.add_news':
      return `Added the news post ${quote(input.title)}${failed}`;
    case 'tool.add_gallery_photo':
      return `Added a gallery photo${failed}`;
    case 'tool.swap_media':
      return `Changed a ${noun}'s picture${failed}`;
    case 'tool.delete_record':
      return `Asked to delete a ${noun}${failed}`;
    case 'tool.drop_edits':
      return `Took back its own changes${failed}`;
    case 'delete.confirmed':
      return `You said yes to deleting ${quote(detail.label)}`;
    case 'delete.declined':
      return `You said no to deleting ${quote(detail.label)}`;
    case 'review.approved':
      return 'The check passed';
    case 'review.rejected':
      return `The check objected${detail.reasons?.length ? `: ${detail.reasons[0]}` : ''}`;
    case 'sent':
      return `Sent ${detail.changes ?? ''} change${detail.changes === 1 ? '' : 's'} to Versions for your approval`;
    case 'sent.overrideReview':
      return 'You sent it to Versions anyway';
    case 'discard':
      return 'You discarded the draft';
    case 'agent.stoppedByAdmin':
      return 'You stopped the assistant';
    case 'agent.stopped':
    case 'agent.providerUnavailable':
    case 'editor.stepLimit':
      return 'The assistant stopped (see the chat for why)';
    case 'review.noVerdict':
      return "The check didn't give an answer, so it needs your decision";
    case 'model.editor':
      return 'AI step (making the change)';
    case 'model.reviewer':
      return 'AI step (checking)';
    case 'settings.setKey':
      return `An API key was saved${detail.last4 ? ` (ending ${detail.last4})` : ''}`;
    case 'settings.removeKey':
      return 'An API key was removed';
    case 'settings.save':
      return 'AI settings were changed';
    case 'prices.check':
      return 'Prices were checked';
    default:
      if (action.startsWith('tool.')) return `Looked at the website${failed}`;
      return action;
  }
}

// What the CMS's AI Assistant did, in plain words, with what it cost. Its changes
// themselves are on the other tabs.
export default function AiActivity() {
  const [view, setView] = useState('important');
  const log = useQuery(api.audit.browse, { limit: 100, ...(view ? { category: view } : {}) });

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-base font-semibold text-foreground">AI Assistant activity</h2>
          <p className="text-sm text-muted-foreground">What the AI Assistant did, most recent first.</p>
        </div>
        <select value={view} onChange={(e) => setView(e.target.value)} className="field w-auto py-1.5 text-sm" aria-label="Show">
          {VIEWS.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      </div>
      {log === undefined && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />}
      {log?.rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nothing yet.</p>}
      {log?.rows.length > 0 && (
        <ul className="divide-y divide-border">
          {log.rows.map((row) => (
            <li key={row._id} className="flex items-baseline gap-4 py-2.5 text-sm" title={row.model ? `Model: ${row.model}` : undefined}>
              <span className="w-28 shrink-0 text-xs whitespace-nowrap text-muted-foreground">{when(row.at)}</span>
              <span className="min-w-0 flex-1 break-words text-foreground">{describe(row)}</span>
              {row.costUsd ? <span className="shrink-0 text-xs tabular-nums text-muted-foreground">${row.costUsd.toFixed(3)}</span> : null}
            </li>
          ))}
        </ul>
      )}
      {log && log.costUsd > 0 && <p className="text-xs text-muted-foreground">These cost about ${log.costUsd.toFixed(2)} in all.</p>}
    </section>
  );
}
