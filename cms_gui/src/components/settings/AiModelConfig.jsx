import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAction, useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { AlertCircle, Check, KeyRound, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { run } from '../../services/convex';
import SpendMeter from '../ai/SpendMeter';

const api = anyApi.ai;

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Google (Gemini)' },
];

const usd = (n) => `$${(n ?? 0).toFixed(2)}`;
const formatDate = (ms) => (ms ? new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'never');

function Section({ title, description, children }) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function ProviderKey({ provider, onSaved }) {
  const setKey = useAction(api.settings.setProviderKey);
  const removeKey = useMutation(api.settings.removeProviderKey);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await run(() => setKey({ provider: provider.name, apiKey: value }));
      setValue('');
      onSaved(`${provider.label} key saved.`, 'success');
    } catch (err) {
      onSaved(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Remove the ${provider.label} API key? The assistant can't use ${provider.label} models until a new key is added.`)) return;
    try {
      await run(() => removeKey({ provider: provider.name }));
      onSaved(`${provider.label} key removed.`, 'success');
    } catch (err) {
      onSaved(err.message, 'error');
    }
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-center">
      <div className="min-w-44">
        <p className="text-sm font-medium text-foreground">{provider.label}</p>
        <p className="text-xs text-muted-foreground">
          {provider.configured ? `Key ending ${provider.last4} · saved ${formatDate(provider.updatedAt)}` : 'No key saved'}
        </p>
        {provider.name === 'google' && (
          <p className="mt-1 max-w-56 text-xs text-muted-foreground">Has a free plan with low limits. Google may use free-plan content to improve its products.</p>
        )}
      </div>
      <input
        type="password"
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={provider.configured ? 'Paste a new key to replace it' : 'Paste the API key'}
        aria-label={`${provider.label} API key`}
        className="field flex-1"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={busy || value.trim().length < 8} className="btn-primary">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Save
        </button>
        {provider.configured && (
          <button type="button" onClick={remove} className="btn-secondary px-3" title="Remove key" aria-label={`Remove ${provider.label} key`}>
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  );
}

const money = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;

// Models come with their names and prices from the daily price check, so the admin picks from a list.
function ModelPicker({ label, value, onChange, priceTable }) {
  const models = priceTable.filter((p) => p.provider === value.provider && p.available !== false).sort((a, b) => (a.name ?? a.model).localeCompare(b.name ?? b.model));
  const changeProvider = (e) => {
    const provider = e.target.value;
    onChange({ provider, model: priceTable.find((p) => p.provider === provider && p.available !== false)?.model ?? '' });
  };
  return (
    <div className="grid gap-2 sm:grid-cols-[10rem_1fr_1fr] sm:items-center">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select value={value.provider} onChange={changeProvider} className="field" aria-label={`${label} provider`}>
        {PROVIDERS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <select value={value.model} onChange={(e) => onChange({ ...value, model: e.target.value })} className="field" aria-label={`${label} model`}>
        {!models.some((m) => m.model === value.model) && <option value={value.model}>{value.model || 'Choose a model'}</option>}
        {models.map((m) => (
          <option key={m.model} value={m.model}>
            {m.name ?? m.model} ({money(m.inputPerMTok)} in, {money(m.outputPerMTok)} out)
          </option>
        ))}
      </select>
    </div>
  );
}

// Prices are checked every day; this says when, and can check now.
function PriceCheck({ check, onCheck, checking }) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Prices (US dollars per million tokens) update automatically every day.
          {check ? ` Last checked ${new Date(check.at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.` : ''}
        </p>
        <button type="button" onClick={onCheck} disabled={checking} className="btn-ghost px-2 py-1 text-xs">
          {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Check now
        </button>
      </div>
      {check?.held?.length > 0 && <p className="text-xs text-warning">A new price for {check.held.join(', ')} looked wrong, so the last known one is still in use.</p>}
    </div>
  );
}

const lastMonths = (count = 12) => {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
};
const monthName = (month) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });

export default function AiModelConfig() {
  const { showToast } = useOutletContext();
  const settings = useQuery(api.settings.get);
  const [month, setMonth] = useState(() => lastMonths()[0]);
  const usage = useQuery(api.usage.summary, { month });
  const save = useMutation(api.settings.save);
  const refreshPrices = useAction(api.prices.refreshNow);
  const [checking, setChecking] = useState(false);

  const [editorModel, setEditorModel] = useState(null);
  const [reviewerModel, setReviewerModel] = useState(null);
  const [sameReviewer, setSameReviewer] = useState(true);
  const [budget, setBudget] = useState('');
  const [prices, setPrices] = useState(null);
  const [saving, setSaving] = useState(false);

  // Load the saved values into the form once.
  if (settings && !editorModel) {
    setEditorModel(settings.editorModel);
    setReviewerModel(settings.reviewerModel);
    setSameReviewer(
      settings.editorModel.provider === settings.reviewerModel.provider && settings.editorModel.model === settings.reviewerModel.model,
    );
    setBudget(String(settings.monthlyBudgetUsd));
    setPrices(settings.priceTable.filter((p) => p.source === 'admin').map(({ provider, model, inputPerMTok, outputPerMTok }) => ({ provider, model, inputPerMTok, outputPerMTok })));
  }

  if (settings === undefined || !editorModel) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  const unpriced = [editorModel, sameReviewer ? null : reviewerModel]
    .filter(Boolean)
    .filter((m) => !settings.priceTable.some((p) => p.provider === m.provider && p.model === m.model));

  const onCheckPrices = async () => {
    setChecking(true);
    try {
      const result = await run(() => refreshPrices({}));
      const summary = result.changed.length ? `${result.changed.length} price${result.changed.length === 1 ? '' : 's'} changed.` : 'No prices changed.';
      showToast(result.failed.length ? `${summary} Couldn't reach ${result.failed.join(', ')}.` : summary, result.failed.length ? 'error' : 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setChecking(false);
    }
  };

  const onSave = async () => {
    // Number('') is 0, which would silently stop the assistant.
    if (String(budget).trim() === '' || !(Number(budget) >= 0)) {
      showToast('Please enter a monthly budget.', 'error');
      return;
    }
    setSaving(true);
    try {
      await run(() =>
        save({
          editorModel,
          reviewerModel: sameReviewer ? editorModel : reviewerModel,
          monthlyBudgetUsd: Number(budget),
          // Prices entered by hand before are kept as they are.
          priceTable: prices,
        }),
      );
      showToast('AI model settings saved.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {!settings.encryptionReady && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Keys can't be saved yet: the server has no encryption key. Ask your developer to run{' '}
            <code className="font-mono">npx convex env set AI_SETTINGS_KEY …</code> (see docs/ai-agent.md).
          </span>
        </div>
      )}

      <Section title="API keys" description="For the AI Assistant. Stored encrypted on the server and never shown again; only the last 4 characters are displayed.">
        <div className="space-y-4">
          {settings.providers.map((p) => (
            <ProviderKey key={p.name} provider={p} onSaved={showToast} />
          ))}
        </div>
      </Section>

      <Section title="Models" description="The editing model makes the changes; the review model checks them before they go to the Versions page.">
        <div className="space-y-3">
          <ModelPicker label="Editing model" value={editorModel} onChange={setEditorModel} priceTable={settings.priceTable} />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={sameReviewer} onChange={(e) => setSameReviewer(e.target.checked)} />
            Use the same model for review
          </label>
          {!sameReviewer && <ModelPicker label="Review model" value={reviewerModel} onChange={setReviewerModel} priceTable={settings.priceTable} />}
          {unpriced.length > 0 && (
            <p className="text-sm text-warning">
              {unpriced.map((m) => m.model || 'No model').join(' and ')} has no price, so the assistant can't count its cost. Choose another model.
            </p>
          )}
          <PriceCheck check={settings.priceCheck} onCheck={onCheckPrices} checking={checking} />
        </div>
      </Section>

      <Section title="Monthly budget" description="You'll see a warning at 80%. At 100% the assistant stops and keeps your draft until the budget is raised or a new month starts.">
        <label className="flex max-w-xs items-center gap-2">
          <span className="text-sm text-muted-foreground">USD</span>
          <input type="number" min="0" step="1" value={budget} onChange={(e) => setBudget(e.target.value)} className="field" aria-label="Monthly budget in US dollars" />
        </label>
      </Section>

      <div className="flex justify-end">
        <button type="button" onClick={onSave} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save
        </button>
      </div>

      <Section title="Usage" description="Token counts come from the provider on every call. Cost is those tokens times the price at the time, so it's an estimate; your provider's bill is the final figure.">
        <SpendMeter />
        <label className="flex max-w-xs items-center gap-2">
          <span className="text-sm text-muted-foreground">Month</span>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="field py-1.5" aria-label="Usage month">
            {lastMonths().map((m) => (
              <option key={m} value={m}>
                {monthName(m)}
              </option>
            ))}
          </select>
        </label>
        {usage?.rows?.length === 0 && <p className="text-sm text-muted-foreground">No AI use in {monthName(month)}.</p>}
        {usage?.rows?.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1.5 pr-4 font-medium">Provider</th>
                  <th className="py-1.5 pr-4 font-medium">Model</th>
                  <th className="py-1.5 pr-4 font-medium">Used for</th>
                  <th className="py-1.5 pr-4 text-right font-medium">Calls</th>
                  <th className="py-1.5 pr-4 text-right font-medium">Tokens in / out</th>
                  <th className="py-1.5 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {usage.rows.map((r) => (
                  <tr key={`${r.provider}/${r.model}/${r.role}`} className="border-t border-border">
                    <td className="py-1.5 pr-4">{PROVIDERS.find((p) => p.value === r.provider)?.label ?? r.provider}</td>
                    <td className="py-1.5 pr-4" title={r.model}>{r.name}</td>
                    <td className="py-1.5 pr-4">{r.role === 'editor' ? 'Editing' : 'Review'}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{r.calls}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">
                      {r.inputTokens.toLocaleString()} / {r.outputTokens.toLocaleString()}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{usd(r.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-medium">
                  <td colSpan={5} className="py-1.5 pr-4">Total for {monthName(month)}</td>
                  <td className="py-1.5 text-right tabular-nums">{usd(usage.totalUsd)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>

    </div>
  );
}
