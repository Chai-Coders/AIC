import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { AlertTriangle, Bot, Check, Copy, Loader2, MessageSquareText, ShieldCheck, Unplug, X } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { run } from '../services/convex';
import { formatDateTime, timeAgo } from '../lib/versions';

function useCopy(showToast) {
  const [copied, setCopied] = useState(null);
  const copy = async (text, key = text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      showToast('Could not copy. Select the text and copy it yourself.', 'warning');
    }
  };
  return { copied, copy };
}

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

function Code({ children, onCopy, copied }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/60 p-3">
      <code className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-[13px] text-foreground">{children}</code>
      <button type="button" onClick={onCopy} className="icon-btn -m-1 shrink-0" aria-label="Copy" title="Copy">
        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

const APPS = [
  {
    id: 'claude',
    label: 'Claude',
    steps: [
      'On claude.ai or in the Claude desktop app, open Settings, then Connectors.',
      'Choose “Add custom connector”.',
      'Name it “AIC website” and paste the connection address from above.',
      'Click Connect. This CMS opens: sign in if asked, then click Allow.',
      'In a chat, turn on the AIC website connector in the tools menu and ask for a change.',
    ],
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    steps: [
      'In ChatGPT, open Settings, then Apps & Connectors, then Advanced settings, and turn on Developer mode. (Your plan must allow connectors that make changes.)',
      'Back in Apps & Connectors, choose Create.',
      'Name it “AIC website”, paste the connection address from above and choose OAuth for authentication.',
      'Click Create. This CMS opens: sign in if asked, then click Allow.',
      'In a chat, pick Developer mode, turn on the AIC website connector and ask for a change.',
    ],
  },
  {
    id: 'claude-code',
    label: 'Claude Code',
    command: (url) => `claude mcp add --transport http aic-website ${url}`,
    steps: [
      'Run the command below in a terminal.',
      'Start Claude Code, type /mcp, choose aic-website and pick Authenticate.',
      'This CMS opens in your browser: sign in if asked, then click Allow.',
    ],
  },
  {
    id: 'other',
    label: 'Other apps',
    command: (url) => JSON.stringify({ mcpServers: { 'aic-website': { url } } }, null, 2),
    steps: [
      'Add a remote MCP server (Streamable HTTP) with the connection address. In Cursor, put the setting below in mcp.json.',
      'When the app asks you to sign in, this CMS opens: sign in, then click Allow.',
    ],
  },
];

const EXAMPLES = [
  'Change Dr. Jane Doe’s job title to Lead Mentor.',
  'Fix the spelling mistakes in every startup description.',
  'Add a news article about our Demo Day on 12 December, with this summary: …',
  'Use the picture at https://… as the logo of EcoCool Thermal.',
  'Remove the startup WINQQR from the website.',
];

const CAN = [
  'Search and read everything on the website',
  'Suggest new text for any field, and new or removed startups, news, team members and photos',
  'Attach pictures from a web address, or give you a link to upload one',
];
const CANNOT = [
  'Publish anything: you approve every change on the Versions page',
  'Change the homepage video',
  'See your password or sign in as you anywhere else',
];

function SittingSetting({ showToast }) {
  const settings = useQuery(anyApi.versions.settings);
  const save = useMutation(anyApi.versions.saveSettings);
  const [value, setValue] = useState(null);
  const [saving, setSaving] = useState(false);
  const current = value ?? (settings ? String(settings.sittingMinutes) : '');

  const handleSave = async (e) => {
    e.preventDefault();
    const minutes = Number(current);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
      showToast('Enter a whole number of minutes between 1 and 1440.', 'error');
      return;
    }
    setSaving(true);
    try {
      await run(() => save({ sittingMinutes: minutes }));
      setValue(null);
      showToast('Saved.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section
      title="Grouping your own edits"
      description="Edits you save in the CMS go live at once. In History they are grouped into one version per sitting, so you can undo a whole sitting together. A sitting ends when you sign out, or after this long without saving anything."
    >
      <form onSubmit={handleSave} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label htmlFor="sitting-minutes" className="block text-sm font-medium text-foreground">
            Start a new version after
          </label>
          <div className="flex items-center gap-2">
            <input
              id="sitting-minutes"
              type="number"
              min={1}
              max={1440}
              step={1}
              value={current}
              onChange={(e) => setValue(e.target.value)}
              disabled={!settings || saving}
              className="field w-24"
            />
            <span className="text-sm text-muted-foreground">minutes without an edit</span>
          </div>
        </div>
        <button type="submit" disabled={!settings || saving || value === null} className="btn-secondary">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </button>
      </form>
    </Section>
  );
}

export default function AiConnectionPage() {
  const { showToast } = useOutletContext();
  const info = useQuery(anyApi.oauth.connectionInfo);
  const connections = useQuery(anyApi.oauth.connections);
  const disconnect = useMutation(anyApi.oauth.disconnect);
  const { copied, copy } = useCopy(showToast);
  const [app, setApp] = useState('claude');
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const url = info?.mcpUrl ?? '';
  const localOnly = /^http:\/\/|localhost|127\.0\.0\.1/.test(url);
  const selected = APPS.find((a) => a.id === app);

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await run(() => disconnect({ clientId: pending.clientId }));
      showToast(`${pending.name} is disconnected. It can no longer read or suggest changes.`, 'success');
      setPending(null);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">AI connection</h1>
        <p className="text-sm text-muted-foreground">
          Ask an AI app like Claude or ChatGPT to update the website for you. You tell it what to change; it prepares the changes,
          and you check and approve them on the{' '}
          <Link to="/versions" className="font-medium text-primary hover:underline">
            Versions
          </Link>{' '}
          page.
        </p>
      </div>

      <Section title="Connection address" description="Paste this into the AI app when you add the AIC website to it.">
        {info === undefined ? (
          <div className="h-12 animate-pulse rounded-lg bg-muted" />
        ) : (
          <Code onCopy={() => copy(url, 'url')} copied={copied === 'url'}>
            {url}
          </Code>
        )}
        {localOnly && (
          <p className="flex items-start gap-2 text-[13px] text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            This address only works on this computer. Claude.ai and ChatGPT connect from the internet, so they need the server’s
            public https address.
          </p>
        )}
      </Section>

      <Section title="Set it up">
        <div role="tablist" aria-label="AI app" className="flex gap-1 overflow-x-auto border-b border-border">
          {APPS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={app === a.id}
              onClick={() => setApp(a.id)}
              className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                app === a.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
        <ol className="space-y-3">
          {selected.steps.map((step, idx) => (
            <li key={step} className="flex gap-3 text-sm text-foreground">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                {idx + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        {selected.command && url && (
          <Code onCopy={() => copy(selected.command(url), selected.id)} copied={copied === selected.id}>
            {selected.command(url)}
          </Code>
        )}
      </Section>

      <Section title="How it works">
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            ['Ask', 'Tell the AI what to change, in your own words. It finds the right fields itself.'],
            ['Check', 'Its changes wait under “Waiting for approval” on the Versions page, before and after side by side.'],
            ['Approve', 'Untick or edit anything, then publish. Every version can be undone later.'],
          ].map(([title, text], idx) => (
            <li key={title} className="rounded-lg border border-border p-4">
              <p className="text-sm font-semibold text-foreground">
                {idx + 1}. {title}
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Things to try" description="Click one to copy it.">
        <ul className="space-y-2">
          {EXAMPLES.map((text) => (
            <li key={text}>
              <button
                type="button"
                onClick={() => copy(text)}
                className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
              >
                <MessageSquareText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">{text}</span>
                {copied === text && <Check className="h-4 w-4 text-success" />}
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Connected apps" description="Apps that can read the website and suggest changes. Disconnect any you no longer use.">
        {connections === undefined ? (
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        ) : connections.length === 0 ? (
          <p className="rounded-lg border border-dashed border-input p-4 text-center text-sm text-muted-foreground">
            No apps connected yet.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {connections.map((c) => (
              <li key={c.clientId} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Bot className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-[13px] text-muted-foreground">
                    Connected {formatDateTime(c.connectedAt)}
                    {c.lastUsedAt ? ` · last used ${timeAgo(c.lastUsedAt)}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPending(c)}
                  className="btn-ghost px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Unplug className="h-4 w-4" />
                  <span className="hidden sm:inline">Disconnect</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="What the AI can and can’t do">
        <div className="grid gap-4 sm:grid-cols-2">
          <ul className="space-y-2">
            {CAN.map((text) => (
              <li key={text} className="flex gap-2 text-sm text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {text}
              </li>
            ))}
          </ul>
          <ul className="space-y-2">
            {CANNOT.map((text) => (
              <li key={text} className="flex gap-2 text-sm text-foreground">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-[13px] text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          Pictures pasted into a chat can’t reach the website. Give the AI a web address of the picture, or ask it for an upload
          link.
        </p>
      </Section>

      <SittingSetting showToast={showToast} />

      <ConfirmModal
        isOpen={!!pending}
        onClose={() => !busy && setPending(null)}
        onConfirm={handleDisconnect}
        icon={Unplug}
        tone="danger"
        title={`Disconnect ${pending?.name}?`}
        message="It stops working straight away. Changes it already suggested stay on the Versions page. You can connect it again later."
        confirmLabel="Disconnect"
        busyLabel="Disconnecting…"
        busy={busy}
      />
    </div>
  );
}
