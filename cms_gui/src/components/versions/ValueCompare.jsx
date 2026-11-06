import { useMemo, useState } from 'react';
import { ArrowRight, ImageOff } from 'lucide-react';
import { wordDiff } from '../../lib/diff';

const LONG = 280;

function Empty({ children = 'Empty' }) {
  return <span className="text-sm italic text-muted-foreground">{children}</span>;
}

function Picture({ src, alt }) {
  if (!src) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm italic text-muted-foreground">
        <ImageOff className="h-4 w-4" /> No picture
      </span>
    );
  }
  return (
    <a href={src} target="_blank" rel="noreferrer" title="Open full size" className="inline-block">
      <img src={src} alt={alt} loading="lazy" className="h-24 w-auto max-w-full rounded-md border border-border bg-muted object-contain" />
    </a>
  );
}

function TextPieces({ pieces, side }) {
  const mark =
    side === 'before'
      ? 'rounded-sm bg-destructive/15 text-destructive line-through decoration-destructive/50'
      : 'rounded-sm bg-success/15 text-success';
  return pieces.map((p, idx) =>
    p.changed ? (
      <mark key={idx} className={`${mark} px-0.5`}>
        {p.text}
      </mark>
    ) : (
      <span key={idx}>{p.text}</span>
    ),
  );
}

/** One side of a comparison, folded when long. */
function Side({ label, children, long }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div
        className={`whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground ${
          long && !open ? 'max-h-40 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]' : ''
        }`}
      >
        {children}
      </div>
      {long && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-[13px] font-medium text-primary hover:underline">
          {open ? 'Show less' : 'Show all'}
        </button>
      )}
    </div>
  );
}

/**
 * Before and after of one field, side by side. Changed words are marked;
 * pictures are shown as thumbnails.
 */
export default function ValueCompare({ kind, before, after, beforeLabel = 'Before', afterLabel = 'After', muted = false }) {
  const isText = kind !== 'image';
  const diff = useMemo(
    () => (isText && before && after ? wordDiff(before, after) : null),
    [isText, before, after],
  );
  const long = isText && ((before?.length ?? 0) > LONG || (after?.length ?? 0) > LONG);

  return (
    <div className={`grid items-start gap-3 sm:grid-cols-[1fr_auto_1fr] ${muted ? 'opacity-60' : ''}`}>
      <Side label={beforeLabel} long={long}>
        {kind === 'image' ? (
          <Picture src={before} alt="Before" />
        ) : before == null ? (
          <Empty />
        ) : diff ? (
          <TextPieces pieces={diff.before} side="before" />
        ) : (
          before
        )}
      </Side>
      <ArrowRight className="hidden h-4 w-4 self-center text-muted-foreground sm:block" aria-hidden="true" />
      <Side label={afterLabel} long={long}>
        {kind === 'image' ? (
          <Picture src={after} alt="After" />
        ) : after == null ? (
          <Empty />
        ) : diff ? (
          <TextPieces pieces={diff.after} side="after" />
        ) : (
          after
        )}
      </Side>
    </div>
  );
}

/** Every field of a record that was added or deleted. */
export function RecordFields({ fields, side }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[160px_1fr]">
      {fields.map((f) => {
        const value = f[side];
        return (
          <div key={f.key} className="contents">
            <dt className="text-sm font-medium text-muted-foreground">{f.label}</dt>
            <dd className="min-w-0 whitespace-pre-wrap break-words text-sm text-foreground">
              {f.kind === 'image' ? <Picture src={value} alt={f.label} /> : value == null ? <Empty /> : (
                <span className="line-clamp-4">{value}</span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
