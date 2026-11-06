import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAction, useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { AlertCircle, Check, KeyRound, Loader2, Plus, Trash2 } from 'lucide-react';
import { run } from '../services/convex';
import SpendMeter from '../components/ai/SpendMeter';

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

function ModelPicker({ label, value, onChange, priceTable }) {
  const listId = `models-${label.replace(/\W/g, '')}`;
  return (
    <div className="grid gap-2 sm:grid-cols-[10rem_1fr_1fr] sm:items-center">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select value={value.provider} onChange={(e) => onChange({ ...value, provider: e.target.value })} className="field" aria-label={`${label} provider`}>
        {PROVIDERS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <input
        list={listId}
        value={value.model}
        onChange={(e) => onChange({ ...value, model: e.target.value })}
        className="field"
        aria-label={`${label} model`}
        placeholder="Model name, e.g. claude-opus-5-5"
      />
      <datalist id={listId}>
        {priceTable
          .filter((p) => p.provider === value.provider)
          .map((p) => (
            <option key={p.model} value={p.model} />
          ))}
      </datalist>
    </div>
  );
}

export default function AiSettingsPage() {
  const { showToast } = useOutletContext();
  const settings = useQuery(api.settings.get);
  const usage = useQuery(api.usage.summary, {});
  const save = useMutation(api.settings.save);

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
    setPrices(settings.priceTable.map((p) => ({ ...p })));
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
    .filter((m) => m.model.trim() && !prices.some((p) => p.provider === m.provider && p.model === m.model.trim()));

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
          priceTable: prices
            .filter((p) => p.model.trim())
            .map((p) => ({ ...p, inputPerMTok: Number(p.inputPerMTok), outputPerMTok: Number(p.outputPerMTok) })),
        }),
      );
      showToast('AI settings saved.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const setPrice = (i, patch) => setPrices((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">AI settings</h1>
        <p className="text-sm text-muted-foreground">
          API keys, models and the monthly spending limit for the AI Assistant. The only running cost is what the AI provider charges.
        </p>
      </div>

      {!settings.encryptionReady && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Keys can't be saved yet: the server has no encryption key. Ask your developer to run{' '}
            <code className="font-mono">npx convex env set AI_SETTINGS_KEY …</code> (see docs/ai-agent.md).
          </span>
        </div>
      )}

      <Section title="This month" description="Spending is worked out from the token counts and the prices below.">
        <SpendMeter />
        {usage?.rows?.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1.5 pr-4 font-medium">Model</th>
                  <th className="py-1.5 pr-4 font-medium">Used for</th>
                  <th className="py-1.5 pr-4 text-right font-medium">Calls</th>
                  <th className="py-1.5 pr-4 text-right font-medium">Tokens in / out</th>
                  <th className="py-1.5 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {usage.rows.map((r) => (
                  <tr key={`${r.model}/${r.role}`} className="border-t border-border">
                    <td className="py-1.5 pr-4 font-mono text-xs">{r.model}</td>
                    <td className="py-1.5 pr-4">{r.role === 'editor' ? 'Editing' : 'Review'}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">{r.calls}</td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">
                      {r.inputTokens.toLocaleString()} / {r.outputTokens.toLocaleString()}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{usd(r.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="API keys" description="Stored encrypted on the server and never shown again. Only the last 4 characters are displayed.">
        <div className="space-y-4">
          {settings.providers.map((p) => (
            <ProviderKey key={p.name} provider={p} onSaved={showToast} />
          ))}
        </div>
      </Section>

      <Section title="Models" description="The editing model makes the changes; the review model checks every change before you can publish it.">
        <div className="space-y-3">
          <ModelPicker label="Editing model" value={editorModel} onChange={setEditorModel} priceTable={prices} />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={sameReviewer} onChange={(e) => setSameReviewer(e.target.checked)} />
            Use the same model for review
          </label>
          {!sameReviewer && <ModelPicker label="Review model" value={reviewerModel} onChange={setReviewerModel} priceTable={prices} />}
          {unpriced.length > 0 && (
            <p className="text-sm text-warning">
              Add a price for {unpriced.map((m) => m.model).join(' and ')} below; the assistant won't use a model it can't count the cost of.
            </p>
          )}
        </div>
      </Section>

      <Section title="Monthly budget" description="You'll see a warning at 80%. At 100% the assistant stops and keeps your draft until the budget is raised or a new month starts.">
        <label className="flex max-w-xs items-center gap-2">
          <span className="text-sm text-muted-foreground">USD</span>
          <input type="number" min="0" step="1" value={budget} onChange={(e) => setBudget(e.target.value)} className="field" aria-label="Monthly budget in US dollars" />
        </label>
      </Section>

      <Section
        title="Prices"
        description={`US dollars per million tokens, from your provider's price page. Last updated ${formatDate(settings.pricesUpdatedAt)}. Out-of-date prices make the spending meter wrong.`}
      >
        <div className="space-y-2">
          <div className="hidden grid-cols-[9rem_1fr_7rem_7rem_2.5rem] gap-2 text-xs text-muted-foreground sm:grid">
            <span>Provider</span>
            <span>Model</span>
            <span>Input</span>
            <span>Output</span>
            <span />
          </div>
          {prices.map((p, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[9rem_1fr_7rem_7rem_2.5rem]">
              <select value={p.provider} onChange={(e) => setPrice(i, { provider: e.target.value })} className="field" aria-label="Provider">
                {PROVIDERS.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </select>
              <input value={p.model} onChange={(e) => setPrice(i, { model: e.target.value })} className="field font-mono text-xs" aria-label="Model" placeholder="model name" />
              <input type="number" min="0" step="0.01" value={p.inputPerMTok} onChange={(e) => setPrice(i, { inputPerMTok: e.target.value })} className="field" aria-label="Input price per million tokens" />
              <input type="number" min="0" step="0.01" value={p.outputPerMTok} onChange={(e) => setPrice(i, { outputPerMTok: e.target.value })} className="field" aria-label="Output price per million tokens" />
              <button type="button" onClick={() => setPrices((rows) => rows.filter((_, j) => j !== i))} className="icon-btn" aria-label={`Remove ${p.model || 'row'}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPrices((rows) => [...rows, { provider: editorModel.provider, model: '', inputPerMTok: 0, outputPerMTok: 0 }])}
            className="btn-ghost"
          >
            <Plus className="h-4 w-4" /> Add a model
          </button>
        </div>
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <button type="button" onClick={onSave} disabled={saving} className="btn-primary shadow-lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save settings
        </button>
      </div>
    </div>
  );
}
