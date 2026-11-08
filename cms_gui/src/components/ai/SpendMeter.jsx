import { useQuery } from 'convex/react';
import { anyApi } from 'convex/server';

// Estimated spend / budget this month, updating by itself after every model call.
// Amber from 80%, red (and the assistant stops) at 100%. Providers don't tell a normal
// API key its balance, so this is the tokens they report times the price list.
export default function SpendMeter({ compact = false }) {
  const meter = useQuery(anyApi.ai.usage.meter);
  if (!meter) return null;

  const pct = Math.min(100, Math.round(meter.ratio * 100));
  const bar = meter.level === 'blocked' ? 'bg-destructive' : meter.level === 'warning' ? 'bg-warning' : 'bg-primary';
  const label = `$${meter.spentUsd.toFixed(2)} of $${meter.budgetUsd.toFixed(2)}`;

  if (compact) return <SpendRing pct={pct} label={label} meter={meter} />;

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'} title={`Estimated AI spend this month: ${label}. Worked out from the tokens each provider reports and the prices checked every day. Your provider's bill is the final figure.`}>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{compact ? 'AI spend' : 'Estimated spend this month'}</span>
        <span className="tabular-nums text-foreground">{label}</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label="Estimated AI spend this month"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className={`h-full rounded-full ${bar} transition-[width]`} style={{ width: `${pct}%` }} />
      </div>
      {meter.onGoogle && <p className="text-xs text-muted-foreground">On Google's free plan you aren't billed for this.</p>}
      {meter.level === 'warning' && <p className="text-xs text-warning">Over 80% of this month's budget.</p>}
      {meter.level === 'blocked' && <p className="text-xs text-destructive">Budget used up. The assistant is paused; drafts are kept.</p>}
    </div>
  );
}

const RING = 2 * Math.PI * 15;

// The chat's version: a small ring that fills with the month's spend, blue, then amber
// from 80%, red when the budget is used up. Hovering (or focusing) it shows the details.
function SpendRing({ pct, label, meter }) {
  const tone = meter.level === 'blocked' ? 'text-destructive' : meter.level === 'warning' ? 'text-warning' : 'text-primary';
  const lines = [
    `AI spend: ${label} this month`,
    meter.onGoogle && "Google's free plan: not billed",
    meter.level === 'warning' && 'Over 80% of the budget',
    meter.level === 'blocked' && 'Budget used up: the assistant is paused',
  ].filter(Boolean);
  return (
    <span className="group relative inline-flex">
      <span
        role="meter"
        tabIndex={0}
        aria-label="Estimated AI spend this month"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={lines.join('. ')}
        className={`inline-flex rounded-full outline-none focus-visible:ring-3 focus-visible:ring-primary/40 ${tone}`}
      >
        <svg width="26" height="26" viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="15" fill="none" strokeWidth="4" className="stroke-muted" />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            strokeWidth="4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeDasharray={`${(Math.max(pct, 2) / 100) * RING} ${RING}`}
            transform="rotate(-90 18 18)"
            className="transition-[stroke-dasharray]"
          />
        </svg>
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 bottom-full z-10 mb-2 hidden w-max max-w-60 space-y-0.5 rounded-lg bg-foreground px-3 py-2 text-xs text-background shadow-lg group-focus-within:block group-hover:block"
      >
        {lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </span>
    </span>
  );
}
