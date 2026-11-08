import { useState } from 'react';
import { useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { Loader2 } from 'lucide-react';

const api = anyApi.ai;

const when = (ms) => new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const CATEGORIES = [
  { value: 'requests', label: 'Requests' },
  { value: 'edits', label: 'Agent actions' },
  { value: 'models', label: 'Model calls' },
  { value: 'reviews', label: 'Reviews' },
  { value: 'sending', label: 'Sent to Versions' },
  { value: 'settings', label: 'Settings' },
  { value: 'other', label: 'Other' },
];
const categoryLabel = (value) => CATEGORIES.find((c) => c.value === value)?.label ?? value;

// What the CMS's AI Assistant did, step by step: every request, tool call, model
// call and review verdict, with its cost. Its changes themselves are on the
// other tabs.
export default function AiActivity() {
  const [category, setCategory] = useState('');
  const [model, setModel] = useState('');
  const log = useQuery(api.audit.browse, { limit: 100, ...(category ? { category } : {}), ...(model ? { model } : {}) });

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-foreground">AI Assistant activity</h2>
        <p className="text-sm text-muted-foreground">Every request, step, review and change sent here by the CMS's AI Assistant, with what each model call cost. Most recent first.</p>
        <div className="flex flex-wrap items-center gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="field w-auto py-1.5 text-xs" aria-label="Show category">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select value={model} onChange={(e) => setModel(e.target.value)} className="field w-auto py-1.5 text-xs" aria-label="Show model">
            <option value="">All models</option>
            {log?.models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {log && (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {log.total} entries · {log.modelCalls} model calls · ${log.costUsd.toFixed(4)}
            </p>
          )}
        </div>
        {log === undefined && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1.5 pr-4 font-medium">When</th>
                <th className="py-1.5 pr-4 font-medium">Category</th>
                <th className="py-1.5 pr-4 font-medium">Model</th>
                <th className="py-1.5 pr-4 font-medium">What</th>
                <th className="py-1.5 pr-4 font-medium">Details</th>
                <th className="py-1.5 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {log?.rows.map((row) => (
                <tr key={row._id} className="border-t border-border align-top">
                  <td className="py-1.5 pr-4 whitespace-nowrap text-muted-foreground">{when(row.at)}</td>
                  <td className="py-1.5 pr-4 whitespace-nowrap text-muted-foreground">{categoryLabel(row.category)}</td>
                  <td className="py-1.5 pr-4 font-mono whitespace-nowrap text-muted-foreground">{row.model ?? ''}</td>
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
