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

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'} title={`Estimated AI spend this month: ${label}. Worked out from the tokens each provider reports and the prices checked every day. Your provider's bill is the final figure.`}>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{compact ? 'Estimated AI spend' : 'Estimated spend this month'}</span>
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
