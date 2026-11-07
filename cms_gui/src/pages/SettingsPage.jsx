import { useOutletContext, useSearchParams } from 'react-router-dom';
import AiModelConfig from '../components/settings/AiModelConfig';
import McpSettings from '../components/settings/McpSettings';
import VersionSettings from '../components/settings/VersionSettings';

const TABS = [
  { value: 'ai', label: 'AI model config' },
  { value: 'mcp', label: 'MCP' },
  { value: 'versions', label: 'Version history' },
];

export default function SettingsPage() {
  const { showToast } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'ai';

  return (
    <div className="space-y-6 pb-16">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">The AI Assistant's models and keys, AI apps connected over MCP, and how your edits are grouped.</p>
      </div>

      <div role="tablist" aria-label="Settings" className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setParams({ tab: t.value }, { replace: true })}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === t.value ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'ai' && <AiModelConfig />}
      {tab === 'mcp' && <McpSettings showToast={showToast} />}
      {tab === 'versions' && <VersionSettings showToast={showToast} />}
    </div>
  );
}
