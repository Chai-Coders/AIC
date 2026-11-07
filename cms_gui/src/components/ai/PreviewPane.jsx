import { forwardRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Columns2, Eye, FileDiff, History, Loader2, Send, Trash2 } from 'lucide-react';
import SitePreview from '../../preview/SitePreview';
import BrowserFrame from './BrowserFrame';
import ChangesView from './ChangesView';
import SplitDivider from './SplitDivider';
import { useStoredSize } from './useStoredSize';

const VIEWS = [
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'split', label: 'Side by side', icon: Columns2, wideOnly: true },
  { id: 'changes', label: 'Changes', icon: FileDiff },
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
      <div role="group" aria-label="Show this page before or after the change" className="flex rounded-lg border border-border p-0.5 text-xs">
        {['before', 'after'].map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => onMode(m)}
            className={`rounded-md px-2.5 py-1 font-medium capitalize ${mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}

const PreviewPane = forwardRef(function PreviewPane(
  { tab, onTab, content, draft, shownDraftId, sent, changeList, step, onStep, mode, onMode, location, canSendAnyway, sending, onSendAnyway, onDiscard, picking, onDonePicking, ...previewEvents },
  ref,
) {
  const [device, setDevice] = useState('desktop');
  const [scale, setScale] = useState(1);
  const [codeWidth, setCodeWidth] = useStoredSize('aic-cms:ai-code-width', 460);
  const showActions = draft && draft.contentOps.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
        <div role="tablist" aria-label="Right pane" className="inline-flex gap-0.5 rounded-lg bg-muted p-[3px]">
          {VIEWS.map(({ id, label, icon: Icon, wideOnly }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => onTab(id)}
              className={`items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${wideOnly ? 'hidden lg:inline-flex' : 'inline-flex'} ${
                tab === id ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
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

      {/* The preview stays in the same place in the tree whatever the view, so the site doesn't reload. */}
      <div className="relative flex min-h-0 flex-1 bg-background">
        {tab === 'split' && (
          <div className="h-full min-w-0 shrink-0" style={{ width: codeWidth }}>
            <ChangesView changeSetId={shownDraftId} changeList={changeList} />
          </div>
        )}
        {tab === 'split' && <SplitDivider label="Resize the changes" value={codeWidth} min={260} max={900} onChange={setCodeWidth} />}
        <div className={tab === 'changes' ? 'invisible absolute inset-0' : 'h-full min-w-0 flex-1'} aria-hidden={tab === 'changes'}>
          <BrowserFrame path={location} device={device} scale={scale} onDeviceChange={setDevice} picking={picking} onDonePicking={onDonePicking}>
            <SitePreview ref={ref} content={content} device={device} onScale={setScale} {...previewEvents} />
          </BrowserFrame>
        </div>
        {tab === 'changes' && (
          <div className="absolute inset-0 bg-background">
            <ChangesView changeSetId={shownDraftId} changeList={changeList} />
          </div>
        )}
      </div>
    </div>
  );
});

export default PreviewPane;
