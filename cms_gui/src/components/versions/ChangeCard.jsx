import { History, RotateCcw, Trash2 } from 'lucide-react';
import ValueCompare, { RecordFields } from './ValueCompare';
import { formatDateTime } from '../../lib/versions';

const OP_BADGE = {
  create: { label: 'Added', className: 'bg-success/15 text-success' },
  update: { label: 'Edited', className: 'bg-accent text-accent-foreground' },
  delete: { label: 'Deleted', className: 'bg-destructive/10 text-destructive' },
};

export function Badge({ className = 'bg-muted text-muted-foreground', children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{children}</span>
  );
}

function Checkbox({ checked, disabled, onChange, label }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      aria-label={label}
      className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-input accent-primary disabled:cursor-not-allowed disabled:opacity-40"
    />
  );
}

/** Why a change is shown greyed out, if it is. */
function notes(change) {
  const out = [];
  if (change.overridden) out.push('Not applied: a later edit to this field was kept');
  if (change.skipped) out.push('Left out when this draft was approved');
  if (change.laterEditAt) out.push(`Changed again on ${formatDateTime(change.laterEditAt)}`);
  if (!change.recordExists && change.op === 'update') out.push(`This ${change.noun} has since been deleted`);
  return out;
}

function putBackLabel(change) {
  if (change.op === 'create') return 'Remove again';
  if (change.op === 'delete') return 'Put back';
  return 'Put back old value';
}

function ChangeRow({ change, selectable, selected, onToggle, onPutBack }) {
  const greyed = change.overridden || change.skipped || (selectable && !selected);
  const extra = notes(change);
  const showNow =
    change.kind !== 'record' && change.kind !== 'image' && change.laterEditAt && change.recordExists && change.current !== change.after;

  return (
    <div className="flex gap-3 border-t border-border px-4 py-4 first:border-t-0 sm:px-5">
      {selectable && (
        <Checkbox
          checked={selected}
          disabled={!change.canUndo}
          onChange={() => onToggle(change.id)}
          label={`Undo ${change.fieldLabel}`}
        />
      )}
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{change.fieldLabel}</span>
          {extra.map((text) => (
            <Badge key={text} className="bg-warning/15 text-warning">
              <History className="h-3 w-3" />
              {text}
            </Badge>
          ))}
          {selectable && !change.canUndo && !change.overridden && !change.skipped && (
            <Badge>Already as it was before</Badge>
          )}
        </div>

        {change.kind === 'record' ? (
          <div className={greyed ? 'opacity-60' : ''}>
            <p className="mb-3 text-[13px] text-muted-foreground">
              {change.op === 'create' ? 'Added to the website with:' : 'Deleted from the website. It had:'}
            </p>
            <RecordFields fields={change.fields} side={change.op === 'create' ? 'after' : 'before'} />
          </div>
        ) : (
          <ValueCompare kind={change.kind} before={change.before} after={change.after} muted={greyed} />
        )}

        {showNow && (
          <p className="line-clamp-2 text-[13px] text-muted-foreground">
            <span className="font-medium text-foreground">Now on the website: </span>
            {change.current ?? 'empty'}
          </p>
        )}
      </div>

      {!selectable && onPutBack && change.canUndo && (
        <button
          type="button"
          onClick={() => onPutBack(change)}
          title={putBackLabel(change)}
          className="btn-ghost h-fit shrink-0 px-2.5 py-1.5 text-[13px]"
        >
          {change.op === 'create' ? <Trash2 className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
          <span className="hidden sm:inline">{putBackLabel(change)}</span>
        </button>
      )}
    </div>
  );
}

/** The changes to one item (a startup, a news article, ...) in a version. */
export default function ChangeCard({ group, selectable = false, selectedIds, onToggle, onPutBack }) {
  const op = group.changes.find((c) => c.kind === 'record')?.op ?? 'update';
  const badge = OP_BADGE[op];
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-4 py-3 sm:px-5">
        <Badge className="bg-card text-muted-foreground ring-1 ring-border">{group.page}</Badge>
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{group.itemTitle}</h3>
        <Badge className={badge.className}>{badge.label}</Badge>
      </header>
      <div>
        {group.changes.map((change) => (
          <ChangeRow
            key={change.id}
            change={change}
            selectable={selectable}
            selected={selectedIds?.has(change.id)}
            onToggle={onToggle}
            onPutBack={onPutBack}
          />
        ))}
      </div>
    </section>
  );
}
