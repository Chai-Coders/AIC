import React from 'react';
import { X, Calendar, Trash2, Image as ImageIcon } from 'lucide-react';

export default function NewsDetailPane({
  newsItem,
  onClose,
  onRequestDelete,
}) {
  if (!newsItem) return null;

  // Helper to extract image URL safely
  const getImageUrl = (item) => {
    const raw = item.thumbnail || item.image || item.photo || item.logo_or_image;
    if (!raw) return null;
    if (typeof raw === 'string') {
      if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
      if (raw.startsWith('/')) return raw;
      return `/${raw}`;
    }
    return null;
  };

  const imageUrl = getImageUrl(newsItem);

  return (
    <div
      key={newsItem.id}
      className="rounded-2xl border border-border bg-card/95 backdrop-blur-md p-5 sm:p-6 shadow-xl flex flex-col h-[calc(100vh-10.5rem)] max-h-[calc(100vh-10.5rem)] overflow-hidden text-card-foreground animate-smooth-left transition-all duration-300"
    >
      {/* Top Bar: Action Buttons & Badges */}
      <div className="flex items-center justify-between pb-3 border-b border-border/70 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold text-primary bg-primary/15 px-2.5 py-0.5 rounded-full">
            Article #{newsItem.id}
          </span>
          {newsItem.published_date && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
              {new Date(newsItem.published_date).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Delete Button */}
          <button
            type="button"
            onClick={() =>
              onRequestDelete({
                id: newsItem.id,
                title: newsItem.title,
                image: imageUrl,
              })
            }
            title="Delete Article"
            className="p-1.5 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Close Pane Button */}
          <button
            type="button"
            onClick={onClose}
            title="Close Preview Pane"
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Header Section: Left Image + Right Heading & Subtitle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start shrink-0 pt-3 pb-1 animate-fade-content">
        {/* Thumbnail Image */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-muted/40 border border-border overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={newsItem.title}
              className="w-full h-full object-cover transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <ImageIcon className="w-7 h-7 text-muted-foreground opacity-40" />
          )}
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-1.5 min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground leading-snug break-words">
            {newsItem.title}
          </h2>
          {newsItem.subtitle && (
            <p className="text-xs text-muted-foreground font-medium leading-relaxed line-clamp-3">
              {newsItem.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Printed Plain Text Content Area (Fixed outer box with internal vertical scroll only) */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-2 pt-3 mt-1 border-t border-border/60 animate-fade-content">
        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words font-normal select-text">
          {newsItem.content || 'No article content provided.'}
        </p>
      </div>
    </div>
  );
}

