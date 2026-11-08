import { Crosshair } from 'lucide-react';
import { SITE_URL } from '../../routes';

const host = SITE_URL.replace(/^https?:\/\//, '').replace(/\/+$/, '') || 'website';

// The preview in a browser-like window, matching the Site text page.
export default function BrowserFrame({ path, device, scale = 1, caption = 'Your website', onDeviceChange, picking, onDonePicking, children }) {
  return (
    <section aria-label="Website preview" className="flex h-full min-h-0 min-w-0 flex-col gap-3 bg-background p-3">
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {picking ? (
          <button type="button" onClick={onDonePicking} className="flex min-w-0 items-center gap-2 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground">
            <Crosshair className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Click things to point at them. Press here when done.
          </button>
        ) : (
          <p className="min-w-0 truncate text-sm text-muted-foreground">
            {caption}{scale < 1 ? `. Shown at ${Math.round(scale * 100)}% to fit.` : '.'}
          </p>
        )}
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

      <div className={`mx-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-[max-width] duration-200 ${device === 'phone' ? 'max-w-[400px]' : 'max-w-full'}`}>
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
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </section>
  );
}
