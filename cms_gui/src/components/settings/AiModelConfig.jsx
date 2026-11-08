import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAction, useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { AlertCircle, Check, KeyRound, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { run } from '../../services/convex';
import SpendMeter from '../ai/SpendMeter';

const api = anyApi.ai;

// Where an admin gets a key for each provider.
const KEY_PAGES = {
  google: { href: 'https://aistudio.google.com/apikey', text: 'Get a free key' },
  anthropic: { href: 'https://console.anthropic.com/settings/keys', text: 'Get a key' },
  openai: { href: 'https://platform.openai.com/api-keys', text: 'Get a key' },
};

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Google (Gemini)' },
];

const usd = (n) => `$${(n ?? 0).toFixed(2)}`;

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
        {provider.configured ? (
          <p className="flex items-center gap-1 text-xs text-success">
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Connected (key ending {provider.last4})
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Not connected
            {KEY_PAGES[provider.name] && (
              <>
                {' · '}
                <a href={KEY_PAGES[provider.name].href} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                  {KEY_PAGES[provider.name].text}
                </a>
              </>
            )}
          </p>
        )}
      </div>
      <input
        type="password"
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={provider.configured ? 'Paste a new key to replace it' : 'Paste the key here'}
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

// One list of every model a saved key can use, grouped by provider, with its price.
function ModelPicker({ label, value, onChange, priceTable, providers }) {
  const usable = providers.filter((p) => p.configured).map((p) => p.name);
  const models = priceTable
    .filter((p) => usable.includes(p.provider) && p.available !== false)
    .sort((a, b) => (a.name ?? a.model).localeCompare(b.name ?? b.model));
  const current = `${value.provider}/${value.model}`;
  if (!models.length) return <p className="text-sm text-muted-foreground">Connect an AI provider above first.</p>;
  return (
    <label className="grid gap-1.5 sm:grid-cols-[9rem_1fr] sm:items-center">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select
        value={current}
        onChange={(e) => {
          const [provider, ...rest] = e.target.value.split('/');
          onChange({ provider, model: rest.join('/') });
        }}
        className="field"
      >
        {!models.some((m) => `${m.provider}/${m.model}` === current) && <option value={current}>{value.model || 'Choose a model'}</option>}
        {PROVIDERS.filter((p) => usable.includes(p.value)).map((p) => (
          <optgroup key={p.value} label={p.label}>
            {models
              .filter((m) => m.provider === p.value)
              .map((m) => (
                <option key={m.model} value={`${m.provider}/${m.model}`}>
                  {m.name ?? m.model} ({money(m.inputPerMTok)} in, {money(m.outputPerMTok)} out per million tokens)
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
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

      <Section title="AI providers" description="The AI Assistant needs a key from at least one. Keys are stored encrypted and never shown again.">
        <div className="space-y-4">
          {settings.providers.map((p) => (
            <ProviderKey key={p.name} provider={p} onSaved={showToast} />
          ))}
        </div>
      </Section>

      <Section title="Model and spending limit" description="Which AI does the work, and the most it may cost in a month. The assistant pauses when the limit is reached; you'll see a warning at 80%.">
        <div className="space-y-4">
          <ModelPicker label="AI model" value={editorModel} onChange={setEditorModel} priceTable={settings.priceTable} providers={settings.providers} />
          {unpriced.length > 0 && <p className="text-sm text-warning">This model has no price yet, so it can't be used. Choose another one.</p>}
          <label className="grid gap-1.5 sm:grid-cols-[9rem_1fr] sm:items-center">
            <span className="text-sm font-medium text-foreground">Monthly limit</span>
            <span className="flex max-w-48 items-center gap-2">
              <input type="number" min="0" step="1" value={budget} onChange={(e) => setBudget(e.target.value)} className="field" aria-label="Monthly budget in US dollars" />
              <span className="text-sm text-muted-foreground">USD</span>
            </span>
          </label>
          <details className="rounded-lg border border-border px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Advanced</summary>
            <div className="space-y-3 pt-3">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={!sameReviewer} onChange={(e) => setSameReviewer(!e.target.checked)} />
                Use a different model to check changes
              </label>
              {!sameReviewer && <ModelPicker label="Checking model" value={reviewerModel} onChange={setReviewerModel} priceTable={settings.priceTable} providers={settings.providers} />}
              <PriceCheck check={settings.priceCheck} onCheck={onCheckPrices} checking={checking} />
            </div>
          </details>
          <div className="flex justify-end">
            <button type="button" onClick={onSave} disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save
            </button>
          </div>
        </div>
      </Section>

      <Section title="Spending" description="An estimate from what the AI provider reports; their bill is the final figure.">
        <SpendMeter />
        <details>
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Show details</summary>
          <div className="space-y-3 pt-3">
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
                      <th className="py-1.5 pr-4 font-medium">Model</th>
                      <th className="py-1.5 pr-4 font-medium">Used for</th>
                      <th className="py-1.5 text-right font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.rows.map((r) => (
                      <tr key={`${r.provider}/${r.model}/${r.role}`} className="border-t border-border">
                        <td className="py-1.5 pr-4" title={`${r.calls} calls · ${r.inputTokens.toLocaleString()} / ${r.outputTokens.toLocaleString()} tokens`}>
                          {r.name}
                        </td>
                        <td className="py-1.5 pr-4">{r.role === 'editor' ? 'Making changes' : 'Checking'}</td>
                        <td className="py-1.5 text-right tabular-nums">{usd(r.costUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border font-medium">
                      <td colSpan={2} className="py-1.5 pr-4">Total for {monthName(month)}</td>
                      <td className="py-1.5 text-right tabular-nums">{usd(usage.totalUsd)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </details>
      </Section>
    </div>
  );
}
