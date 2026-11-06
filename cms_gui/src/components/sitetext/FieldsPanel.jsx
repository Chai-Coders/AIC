import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';

const HELP = {
  rich: 'Wrap words in *asterisks* for italics, or **double asterisks** for bold.',
  list: 'One item per line.',
};

const rowsFor = (value, kind) => {
  const lines = value.split('\n').length;
  if (kind === 'list') return Math.min(10, Math.max(2, lines));
  return Math.min(8, Math.max(2, Math.ceil(value.length / 48) + lines - 1));
};

const matches = (field, value, query) =>
  `${field.label} ${field.key} ${value}`.toLowerCase().includes(query);

function Field({ field, value, edited, changedFromOriginal, highlighted, onChange, onUndo, onRestore, onFocus }) {
  const id = `text-${field.key.replace(/\./g, '-')}`;
  const props = {
    id,
    value,
    'data-key': field.key,
    onChange: (e) => onChange(field.key, e.target.value),
    onFocus: () => onFocus(field.key),
  };
  return (
    <div
      data-field={field.key}
      className={`-mx-2.5 space-y-1.5 rounded-lg p-2.5 transition-colors ${
        highlighted ? 'bg-primary/10 ring-2 ring-primary/40' : ''
      }`}
    >
      <div className="flex items-baseline gap-2">
        <label htmlFor={id} className="text-[13px] font-semibold text-foreground">
          {field.label}
        </label>
        {edited && (
          <>
            <span className="h-1.5 w-1.5 shrink-0 self-center rounded-full bg-warning" title="Not published yet" />
            <button type="button" onClick={() => onUndo(field.key)} className="text-xs font-semibold text-primary hover:underline">
              Undo
            </button>
          </>
        )}
        <span className="ml-auto min-w-0 truncate font-mono text-[11px] text-muted-foreground" title={field.key}>
          {field.key}
        </span>
      </div>
      {field.kind === 'line' ? (
        <input type="text" {...props} className="field" />
      ) : (
        <textarea rows={rowsFor(value, field.kind)} {...props} className="field resize-y" />
      )}
      {(HELP[field.kind] || changedFromOriginal) && (
        <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
          <span>{HELP[field.kind]}</span>
          {changedFromOriginal && (
            <button
              type="button"
              onClick={() => onRestore(field.key)}
              className="shrink-0 font-semibold text-muted-foreground hover:text-foreground hover:underline"
              title={`Original: ${field.value}`}
            >
              Restore original
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The texts of one page as form fields, in collapsible groups.
 * `focusRequest` ({ key }) opens, scrolls to and focuses a field when the
 * text is clicked in the preview.
 */
export default function FieldsPanel({ groups, valueOf, isEdited, selected, focusRequest, onChange, onUndo, onRestore, onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(() => new Set(groups[0] ? [groups[0].name] : []));
  const bodyRef = useRef(null);

  // A new request opens the field's group and clears the search, so the field is on screen.
  const [handledRequest, setHandledRequest] = useState(focusRequest);
  if (focusRequest !== handledRequest) {
    setHandledRequest(focusRequest);
    const group = focusRequest && groups.find((g) => g.fields.some((f) => f.key === focusRequest.key));
    if (group) {
      setOpen((prev) => new Set(prev).add(group.name));
      setQuery('');
    }
  }

  useEffect(() => {
    if (!focusRequest) return;
    // Wait for the group to open before scrolling to the field.
    const frame = requestAnimationFrame(() => {
      const row = bodyRef.current?.querySelector(`[data-field="${CSS.escape(focusRequest.key)}"]`);
      if (!row) return;
      row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      row.querySelector('[data-key]')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusRequest]);

  const q = query.trim().toLowerCase();
  const shown = groups
    .map((g) => ({ ...g, fields: q ? g.fields.filter((f) => matches(f, valueOf(f.key), q)) : g.fields }))
    .filter((g) => g.fields.length > 0);

  const toggle = (name) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border p-3">
        <label className="relative block">
          <span className="sr-only">Search text on this page</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search text on this page"
            className="field pl-9"
          />
        </label>
      </div>

      <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        {shown.length === 0 && (
          <p className="px-2 py-10 text-center text-sm text-muted-foreground">No text matches “{query}”.</p>
        )}
        {shown.map((group) => {
          const isOpen = Boolean(q) || open.has(group.name);
          const editedCount = group.fields.filter((f) => isEdited(f.key)).length;
          return (
            <section key={group.name} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => toggle(group.name)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2 py-3 text-left text-sm font-semibold text-foreground"
              >
                <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                <span>{group.name}</span>
                {group.shared && (
                  <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
                    All pages
                  </span>
                )}
                <span className="ml-auto text-xs font-medium text-muted-foreground">
                  {editedCount > 0 && `${editedCount} edited · `}
                  {group.fields.length}
                </span>
              </button>
              {isOpen && (
                <div className="space-y-3 pb-4">
                  {group.fields.map((field) => (
                    <Field
                      key={field.key}
                      field={field}
                      value={valueOf(field.key)}
                      edited={isEdited(field.key)}
                      changedFromOriginal={valueOf(field.key) !== field.value}
                      highlighted={field.key === selected}
                      onChange={onChange}
                      onUndo={onUndo}
                      onRestore={onRestore}
                      onFocus={onSelect}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
