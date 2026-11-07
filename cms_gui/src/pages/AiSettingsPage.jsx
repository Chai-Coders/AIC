import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAction, useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { AlertCircle, Check, KeyRound, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
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

const money = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
const OTHER = '__other';

// Models come with their names and prices from the automatic check, so the admin picks
// from a list. "Other" is for one the check doesn't know, which then needs a price.
function ModelPicker({ label, value, onChange, priceTable }) {
  const models = priceTable.filter((p) => p.provider === value.provider && p.available !== false).sort((a, b) => (a.name ?? a.model).localeCompare(b.name ?? b.model));
  const known = priceTable.some((p) => p.provider === value.provider && p.model === value.model);
  const [typing, setTyping] = useState(!known);
  const pick = (e) => {
    if (e.target.value === OTHER) {
      setTyping(true);
      onChange({ ...value, model: '' });
    } else {
      setTyping(false);
      onChange({ ...value, model: e.target.value });
    }
  };
  const changeProvider = (e) => {
    const provider = e.target.value;
    const first = priceTable.find((p) => p.provider === provider && p.available !== false);
    setTyping(!first);
    onChange({ provider, model: first?.model ?? '' });
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
      <div className="space-y-2">
        <select value={typing ? OTHER : value.model} onChange={pick} className="field" aria-label={`${label} model`}>
          {known && !typing && !models.some((m) => m.model === value.model) && <option value={value.model}>{value.model}</option>}
          {models.map((m) => (
            <option key={m.model} value={m.model}>
              {m.name ?? m.model} ({money(m.inputPerMTok)} in, {money(m.outputPerMTok)} out)
            </option>
          ))}
          <option value={OTHER}>Other model…</option>
        </select>
        {typing && (
          <input value={value.model} onChange={(e) => onChange({ ...value, model: e.target.value })} className="field font-mono text-xs" aria-label={`${label} model name`} placeholder="The model's exact name" />
        )}
      </div>
    </div>
  );
}

const PRICE_PAGES = [
  { label: 'Anthropic', href: 'https://claude.com/pricing' },
  { label: 'Google', href: 'https://ai.google.dev/gemini-api/docs/pricing' },
  { label: 'OpenAI', href: 'https://openai.com/api/pricing/' },
];

// Where each price came from. Only the current models show until the admin asks for the rest.
function PriceList({ priceTable, inUse, check, onCheck, checking }) {
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  const needle = search.trim().toLowerCase();
  const isInUse = (p) => inUse.some((m) => m.provider === p.provider && m.model === p.model);
  const unsure = (p) => p.source === 'unconfirmed' || p.held;
  const rows = priceTable
    .filter((p) => (needle ? `${p.name ?? ''} ${p.model}`.toLowerCase().includes(needle) : showAll || isInUse(p)))
    .sort((a, b) => isInUse(b) - isInUse(a) || a.provider.localeCompare(b.provider) || (a.name ?? a.model).localeCompare(b.name ?? b.model));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onCheck} disabled={checking} className="btn-secondary">
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Check prices now
        </button>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {check ? `Last checked ${new Date(check.at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}. Checked every day.` : 'Not checked yet. Checked every day.'}
        </p>
      </div>
      {check?.failed?.length > 0 && <p className="text-xs text-warning">Couldn't reach {check.failed.join(', ')} at the last check, so the other sources were used.</p>}
      {check?.held?.length > 0 && <p className="text-xs text-warning">A new price for {check.held.join(', ')} looked wrong, so the last known one is still in use. Please check it on the provider's page.</p>}
      <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} className="field max-w-sm" aria-label="Search models" placeholder={`Search all ${priceTable.length} models`} />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-1.5 pr-4 font-medium">Model</th>
              <th className="py-1.5 pr-4 text-right font-medium">Input</th>
              <th className="py-1.5 pr-4 text-right font-medium">Output</th>
              <th className="py-1.5 font-medium">Where the price came from</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={`${p.provider}/${p.model}`} className="border-t border-border align-top">
                <td className="py-1.5 pr-4">
                  {p.name ?? p.model} {isInUse(p) && <span className="text-xs text-primary">In use</span>}
                  <span className="block font-mono text-xs text-muted-foreground">{p.model}</span>
                </td>
                <td className="py-1.5 pr-4 text-right tabular-nums">{money(p.inputPerMTok)}</td>
                <td className="py-1.5 pr-4 text-right tabular-nums">{money(p.outputPerMTok)}</td>
                <td className={`py-1.5 text-xs ${unsure(p) ? 'text-warning' : 'text-muted-foreground'}`}>
                  {p.sourceLabel ?? 'Your own price'}
                  {p.available === false && ' · Your key can\'t use it'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!needle && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="btn-ghost">
          {showAll ? 'Show only the models in use' : `Show all ${priceTable.length} models`}
        </button>
      )}
      <p className="text-xs text-muted-foreground">
        Check a price yourself:{' '}
        {PRICE_PAGES.map((page, i) => (
          <span key={page.href}>
            {i > 0 && ', '}
            <a href={page.href} target="_blank" rel="noreferrer" className="text-primary underline">
              {page.label}
            </a>
          </span>
        ))}
        .
      </p>
    </div>
  );
}

const lastMonths = (count = 12) => {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
};
const monthName = (month) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });

export default function AiSettingsPage() {
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
    .filter((m) => m.model.trim() && ![...settings.priceTable, ...prices].some((p) => p.provider === m.provider && p.model === m.model.trim()));

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

      <Section title="API keys" description="Stored encrypted on the server and never shown again. Only the last 4 characters are displayed.">
        <div className="space-y-4">
          {settings.providers.map((p) => (
            <ProviderKey key={p.name} provider={p} onSaved={showToast} />
          ))}
        </div>
      </Section>

      <Section title="Models" description="The editing model makes the changes; the review model checks every change before you can publish it.">
        <div className="space-y-3">
          <ModelPicker label="Editing model" value={editorModel} onChange={setEditorModel} priceTable={settings.priceTable} />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={sameReviewer} onChange={(e) => setSameReviewer(e.target.checked)} />
            Use the same model for review
          </label>
          {!sameReviewer && <ModelPicker label="Review model" value={reviewerModel} onChange={setReviewerModel} priceTable={settings.priceTable} />}
          {unpriced.length > 0 && (
            <p className="text-sm text-warning">
              Add your own price for {unpriced.map((m) => m.model).join(' and ')} below; the assistant won't use a model it can't count the cost of.
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
        description="US dollars per million tokens, kept current automatically. Each provider's own price page comes first where it can be read, then two public price lists, LiteLLM and OpenRouter. If they disagree, the higher price is used so the budget can't be passed by surprise."
      >
        <PriceList priceTable={settings.priceTable} inUse={[settings.editorModel, settings.reviewerModel]} check={settings.priceCheck} onCheck={onCheckPrices} checking={checking} />
      </Section>

      <Section title="Your own prices (optional)" description="For a discount, or a model the check doesn't know. These always win over the automatic prices. Saved with Save settings.">
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
