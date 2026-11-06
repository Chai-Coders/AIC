import { forwardRef, useState } from 'react';
import { MousePointerClick } from 'lucide-react';

/**
 * The real website in edit mode (?cms-edit=1), in a browser-like frame.
 * The page talks to it through the iframe (`ref`), see SiteTextPage.
 */
const PreviewFrame = forwardRef(function PreviewFrame({ siteUrl, path, hint, device, onDeviceChange, onLoad, overlay }, ref) {
  // Loaded once; after that the CMS moves between pages by messaging the site.
  const [src] = useState(() => `${siteUrl}/?cms-edit=1`);
  const host = siteUrl.replace(/^https?:\/\//, '');

  return (
    <section aria-label="Website preview" className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 bg-background p-3 sm:p-4 lg:p-5">
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <MousePointerClick className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">{hint}</span>
        </p>
        <div role="group" aria-label="Preview width" className="ml-auto inline-flex gap-0.5 rounded-lg bg-muted p-[3px]">
          {['desktop', 'phone'].map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={device === d}
              onClick={() => onDeviceChange(d)}
              className={`rounded-md px-3 py-1.5 text-[13px] font-semibold capitalize transition-colors ${
                device === d ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`relative mx-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[max-width] duration-200 ${
          device === 'phone' ? 'max-w-[400px]' : 'max-w-full'
        }`}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-border bg-muted px-3.5 py-2.5">
          <div className="flex gap-1.5" aria-hidden="true">
            <i className="h-2.5 w-2.5 rounded-full bg-input" />
            <i className="h-2.5 w-2.5 rounded-full bg-input" />
            <i className="h-2.5 w-2.5 rounded-full bg-input" />
          </div>
          <p className="min-w-0 flex-1 truncate rounded-md bg-card px-2.5 py-1 text-center font-mono text-xs text-muted-foreground">
            {host}
            {path}
          </p>
        </div>
        <iframe ref={ref} src={src} title="Website preview" onLoad={onLoad} className="min-h-0 w-full flex-1 border-0 bg-white" />
        {overlay && <div className="absolute inset-x-0 bottom-0 top-[45px] flex items-center justify-center bg-card p-6">{overlay}</div>}
      </div>
    </section>
  );
});

export default PreviewFrame;
