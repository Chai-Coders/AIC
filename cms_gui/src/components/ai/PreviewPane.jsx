import { forwardRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { ChevronLeft, ChevronRight, History, Loader2, Send, Trash2 } from 'lucide-react';
import SitePreview from '../../preview/SitePreview';
import BrowserFrame from './BrowserFrame';

// The website as visitors see it now, or as it will be once the changes waiting on
// the Versions page are approved. The detailed before/after comparison is on Versions.
const MODES = [
  { id: 'before', label: 'Now' },
  { id: 'after', label: 'After approval' },
];

function Walkthrough({ items, index, onStep, mode, onMode }) {
  if (items.length === 0) return null;
  const item = items[index];
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
      <button type="button" onClick={() => onStep(index - 1)} disabled={index === 0} className="icon-btn p-1.5" aria-label="Previous change">
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-xs font-semibold whitespace-nowrap text-foreground" aria-live="polite">
        Change {index + 1} of {items.length}
      </span>
      <button type="button" onClick={() => onStep(index + 1)} disabled={index === items.length - 1} className="icon-btn p-1.5" aria-label="Next change">
        <ChevronRight className="h-4 w-4" />
      </button>
      <p className="min-w-40 flex-1 truncate text-sm text-foreground" title={item.summary}>
        {item.summary}
      </p>
      <div role="group" aria-label="Show the website now or after approval" className="flex rounded-full bg-muted p-[3px] text-xs">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={mode === m.id}
            onClick={() => onMode(m.id)}
            className={`rounded-full px-3 py-1 font-semibold ${mode === m.id ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const PreviewPane = forwardRef(function PreviewPane(
  { content, draft, sent, changeList, step, onStep, mode, onMode, location, canSendAnyway, sending, onSendAnyway, onDiscard, picking, onDonePicking, ...previewEvents },
  ref,
) {
  const [device, setDevice] = useState('desktop');
  const showActions = draft && draft.contentOps.length > 0;
  // Changes from the AI Assistant and AI apps that wait on the Versions page.
  const waiting = useQuery(anyApi.drafts.pendingCount) ?? 0;
  const caption =
    mode === 'before'
      ? 'Your website as visitors see it now'
      : draft?.contentOps.length || waiting > 0
        ? 'Your website as it will be once the changes are approved'
        : 'Your website as visitors see it';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
        <p className="text-sm font-semibold text-foreground">Your website</p>
        <span className="flex-1" />

        {showActions && (
          <>
            <button type="button" onClick={onDiscard} disabled={sending || draft.running} className="btn-secondary px-3 py-1.5 text-xs">
              <Trash2 className="h-3.5 w-3.5" /> Discard
            </button>
            {canSendAnyway && (
              <button type="button" onClick={onSendAnyway} disabled={sending} className="btn-primary px-3 py-1.5 text-xs">
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send anyway
              </button>
            )}
          </>
        )}
        {sent && (
          <Link to="/versions?tab=pending" className="btn-primary px-3 py-1.5 text-xs">
            <History className="h-3.5 w-3.5" /> Review on Versions
          </Link>
        )}
      </div>

      <Walkthrough items={changeList} index={step} onStep={onStep} mode={mode} onMode={onMode} />

      <div className="relative flex min-h-0 flex-1 bg-background">
        <div className="h-full min-w-0 flex-1">
          <BrowserFrame path={location} device={device} caption={caption} onDeviceChange={setDevice} picking={picking} onDonePicking={onDonePicking}>
            <SitePreview ref={ref} content={content} {...previewEvents} />
          </BrowserFrame>
        </div>
      </div>
    </div>
  );
});

export default PreviewPane;
