import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { AlertTriangle, Bot, Check, Copy, Unplug } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';
import { run } from '../../services/convex';
import { formatDateTime, timeAgo } from '../../lib/versions';

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
    id: 'other',
    label: 'Other apps',
    command: (url) => JSON.stringify({ mcpServers: { 'aic-website': { url } } }, null, 2),
    // For developer tools; most admins use Claude or ChatGPT.
    commandLabel: 'Claude Code: run this in a terminal, then type /mcp and choose Authenticate.',
    extraCommand: (url) => `claude mcp add --transport http aic-website ${url}`,
    steps: [
      'In the app, add a remote MCP server with the connection address above. (Cursor: put the setting below in mcp.json.)',
      'When the app asks you to sign in, this CMS opens: sign in, then click Allow.',
    ],
  },
];

export default function McpSettings({ showToast }) {
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
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Connect an AI app like Claude or ChatGPT over MCP, and ask it to update the website. It can read the website and suggest
        changes, but nothing goes live until you approve it on the{' '}
        <Link to="/versions" className="font-medium text-primary hover:underline">
          Versions
        </Link>{' '}
        page.
      </p>

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
        {selected.extraCommand && url && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">{selected.commandLabel}</p>
            <Code onCopy={() => copy(selected.extraCommand(url), 'extra')} copied={copied === 'extra'}>
              {selected.extraCommand(url)}
            </Code>
          </div>
        )}
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
