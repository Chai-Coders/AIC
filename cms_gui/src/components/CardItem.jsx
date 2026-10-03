import { useState } from 'react';
import { Check, ExternalLink, ImageOff, Pencil, Trash2 } from 'lucide-react';
import { resolveImageUrl } from '../lib/media';

function Thumbnail({ src, alt, fit, className }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`flex items-center justify-center overflow-hidden bg-muted ${className}`}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={`h-full w-full ${fit === 'contain' ? 'object-contain p-2' : 'object-cover'}`}
          onError={() => setFailed(true)}
        />
      ) : (
        <ImageOff className="h-6 w-6 text-muted-foreground/50" />
      )}
    </div>
  );
}

function SelectBox({ selected }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors ${
        selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card'
      }`}
    >
      {selected && <Check className="h-4 w-4" strokeWidth={3} />}
    </span>
  );
}

export default function CardItem({ item, section, selecting, selected, onToggleSelect, onEdit, onDelete }) {
  const { title, subtitle, meta, tag, link } = section.summarize(item);
  const imageUrl = resolveImageUrl(item, section.imageField);
  const isTile = section.layout === 'tiles';

  const handleActivate = () => (selecting ? onToggleSelect(item.id) : onEdit(item));

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete({ id: item.id, title, image: imageUrl });
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(item);
  };

  const cardProps = {
    role: 'button',
    tabIndex: 0,
    'aria-pressed': selecting ? selected : undefined,
    'aria-label': selecting ? `${selected ? 'Unselect' : 'Select'} ${title}` : `Edit ${title}`,
    onClick: handleActivate,
    onKeyDown: (e) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleActivate();
      }
    },
  };

  const frame = `group relative overflow-hidden rounded-xl border bg-card transition-all focus:outline-none focus-visible:ring-3 focus-visible:ring-primary/40 ${
    selected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/40 hover:shadow-md'
  }`;

  const actions = !selecting && (
    <div className="flex shrink-0 items-center gap-1">
      <button type="button" onClick={handleEdit} className="btn-ghost px-2.5 py-1.5 text-[13px]">
        <Pencil className="h-3.5 w-3.5" />
        <span>Edit</span>
      </button>
      <button
        type="button"
        onClick={handleDelete}
        title="Delete"
        aria-label={`Delete ${title}`}
        className="icon-btn p-1.5 hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  if (isTile) {
    return (
      <div {...cardProps} className={`${frame} flex flex-col`}>
        <Thumbnail
          src={imageUrl}
          alt={title}
          fit={section.imageFit}
          className={section.id === 'team' ? 'aspect-square' : 'aspect-[4/3]'}
        />
        {selecting && (
          <div className="absolute left-3 top-3">
            <SelectBox selected={selected} />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-1 p-3.5">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{title}</h3>
          {subtitle && <p className="line-clamp-1 text-[13px] text-muted-foreground">{subtitle}</p>}
          {(meta || tag) && (
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-1.5">
              {tag && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{tag}</span>
              )}
              {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
            </div>
          )}
        </div>
        {actions && <div className="flex justify-end border-t border-border px-2 py-1.5">{actions}</div>}
      </div>
    );
  }

  return (
    <div {...cardProps} className={`${frame} flex items-center gap-4 p-3 sm:p-4`}>
      {selecting && <SelectBox selected={selected} />}
      <Thumbnail
        src={imageUrl}
        alt={title}
        fit={section.imageFit}
        className="h-16 w-16 shrink-0 rounded-lg border border-border sm:h-20 sm:w-20"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="line-clamp-1 text-[15px] font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">{subtitle}</p>}
        {(meta || link) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-muted-foreground">
            {meta && <span>{meta}</span>}
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex min-w-0 items-center gap-1 text-primary hover:underline"
              >
                <span className="truncate">{link.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            )}
          </div>
        )}
      </div>
      {actions && <div className="hidden sm:block">{actions}</div>}
    </div>
  );
}
