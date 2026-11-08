import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { Loader2 } from 'lucide-react';
import { run } from '../../services/convex';

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

export default function VersionSettings({ showToast }) {
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
      title="Grouping your edits"
      description="Edits you make by hand go live straight away. On the Versions page, edits made close together count as one version, so you can undo them in one go."
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
