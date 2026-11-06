import { forwardRef } from 'react';
import { ChevronLeft, ChevronRight, Eye, FileDiff, Loader2, Rocket, Trash2 } from 'lucide-react';
import SitePreview from '../../preview/SitePreview';
import ChangesView from './ChangesView';

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
  { tab, onTab, files, dependencies, draft, changeList, step, onStep, mode, onMode, location, canPublish, publishLabel, publishing, onPublish, onDiscard, onApplyContent, onAbandonContent, ...previewEvents },
  ref,
) {
  const showActions = draft && ['drafting', 'building', 'reviewing', 'needs_admin', 'ready'].includes(draft.status) && (draft.contentOps.length > 0 || draft.codeEdits.length > 0);
  const waitingForDeploy = draft?.status === 'publishing' && draft.versionId;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
        <div role="tablist" aria-label="Right pane" className="flex gap-1">
          <button type="button" role="tab" aria-selected={tab === 'preview'} onClick={() => onTab('preview')} className={`btn-ghost px-2.5 py-1 text-xs ${tab === 'preview' ? 'bg-muted text-foreground' : ''}`}>
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
          <button type="button" role="tab" aria-selected={tab === 'changes'} onClick={() => onTab('changes')} className={`btn-ghost px-2.5 py-1 text-xs ${tab === 'changes' ? 'bg-muted text-foreground' : ''}`}>
            <FileDiff className="h-3.5 w-3.5" /> Changes
          </button>
        </div>
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{tab === 'preview' ? location : ''}</span>

        {showActions && (
          <>
            <button type="button" onClick={onDiscard} disabled={publishing || draft.running} className="btn-secondary px-3 py-1.5 text-xs">
              <Trash2 className="h-3.5 w-3.5" /> Discard
            </button>
            <button type="button" onClick={onPublish} disabled={!canPublish || publishing} className="btn-primary px-3 py-1.5 text-xs" title={canPublish ? undefined : 'Available once the review has finished'}>
              {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
              {publishLabel}
            </button>
          </>
        )}
        {waitingForDeploy && (
          <>
            <button type="button" onClick={onAbandonContent} className="btn-secondary px-3 py-1.5 text-xs">
              Give up on content
            </button>
            <button type="button" onClick={onApplyContent} className="btn-primary px-3 py-1.5 text-xs">
              Apply content
            </button>
          </>
        )}
      </div>

      <Walkthrough items={changeList} index={step} onStep={onStep} mode={mode} onMode={onMode} />

      {/* The preview stays mounted under the Changes tab, so the site doesn't reload. */}
      <div className="relative min-h-0 flex-1 bg-background">
        <div className={`absolute inset-0 ${tab === 'preview' ? '' : 'invisible'}`} aria-hidden={tab !== 'preview'}>
          {files ? (
            <SitePreview ref={ref} files={files} dependencies={dependencies} {...previewEvents} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading the website…
            </div>
          )}
        </div>
        {tab === 'changes' && (
          <div className="absolute inset-0 bg-background">
            <ChangesView changeSetId={draft?._id} changeList={changeList} />
          </div>
        )}
      </div>
    </div>
  );
});

export default PreviewPane;
