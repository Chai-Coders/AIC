import React from 'react';
import {
  Trash2,
  CheckCircle2,
  Circle,
  ExternalLink,
  Calendar,
  Image as ImageIcon,
  Globe,
} from 'lucide-react';

export default function CardItem({
  item,
  routeId,
  multiSelect,
  isSelected,
  isPreviewSelected,
  onToggleSelect,
  onSelectForPreview,
  onRequestDelete,
}) {
  // Helper to extract image URL safely
  const getImageUrl = (item) => {
    const raw = item.image || item.logo_or_image || item.thumbnail || item.photo;
    if (!raw) return null;
    if (typeof raw === 'string') {
      if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
      if (raw.startsWith('/')) return raw;
      return `/${raw}`;
    }
    return null;
  };

  // Helper to get title and description based on schema
  const getItemDetails = (item, routeId) => {
    switch (routeId) {
      case 'gallery':
        return {
          title: item.subtext || `Gallery Item #${item.id}`,
          subtitle: item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Gallery Asset',
          body: null,
          link: null,
        };
      case 'startups':
        return {
          title: item.name || `Startup #${item.id}`,
          subtitle: item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Startup Venture',
          body: item.description,
          link: item.website_url,
        };
      case 'news':
        return {
          title: item.title || `News #${item.id}`,
          subtitle: item.subtitle || (item.published_date ? new Date(item.published_date).toLocaleDateString() : 'News Update'),
          body: item.content,
          link: null,
        };
      case 'team':
        return {
          title: item.name || `Team Member #${item.id}`,
          subtitle: item.role || 'Member',
          categoryDisplay: item.category_display || (item.category ? item.category.toUpperCase() : null),
          body: item.bio,
          link: null,
        };
      default:
        return {
          title: item.title || item.name || item.subtext || `Item #${item.id}`,
          subtitle: 'Content item',
          body: item.description || item.bio || item.content,
          link: null,
        };
    }
  };

  const imageUrl = getImageUrl(item);
  const details = getItemDetails(item, routeId);

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onRequestDelete({
      id: item.id,
      title: details.title,
      image: imageUrl,
    });
  };

  const handleCardClick = () => {
    if (multiSelect) {
      onToggleSelect(item.id);
    } else if (routeId === 'news') {
      onSelectForPreview?.(item);
    }
  };

  // =========================================================================
  // 1. STARTUP COMPACT HORIZONTAL RECTANGLE (3-COLUMN GRID MATCHING WIREFRAME)
  // =========================================================================
  if (routeId === 'startups') {
    return (
      <div
        onClick={handleCardClick}
        className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden flex flex-row items-center p-3.5 sm:p-4 gap-3.5 select-none min-h-[96px] ${
          multiSelect ? 'cursor-pointer' : 'hover:-translate-y-0.5'
        } ${
          isSelected
            ? 'border-primary ring-2 ring-primary/40 bg-primary/5 shadow-md shadow-primary/10'
            : 'border-border bg-card hover:border-primary/50 hover:shadow-md'
        }`}
      >
        {/* Left: Startup Logo / Image */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-background/80 border border-border overflow-hidden flex items-center justify-center p-1.5 shrink-0">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={details.title}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <ImageIcon className="w-6 h-6 text-muted-foreground opacity-40" />
          )}
        </div>

        {/* Right: Startup Name & Exact Link */}
        <div className="min-w-0 flex-1 space-y-1 pr-6">
          <div className="flex items-center justify-between gap-1.5">
            <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
              {details.title}
            </h3>
            <span className="text-[10px] font-mono text-muted-foreground shrink-0 bg-accent/60 px-1.5 py-0.5 rounded">
              #{item.id}
            </span>
          </div>

          {details.body && (
            <p className="text-[11px] text-muted-foreground/85 line-clamp-1 leading-normal">
              {details.body}
            </p>
          )}

          {details.link ? (
            <a
              href={details.link}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={details.link}
              className="flex items-center gap-1 text-xs font-mono text-primary hover:underline truncate"
            >
              <Globe className="w-3 h-3 shrink-0" />
              <span className="truncate">{details.link}</span>
              <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
            </a>
          ) : (
            <span className="text-[11px] font-mono text-muted-foreground/60 block">
              No link attached
            </span>
          )}
        </div>

        {/* Multi-Select Checkbox Indicator */}
        {multiSelect && (
          <div className="absolute top-2.5 right-2.5 z-20">
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-background/90 backdrop-blur-md border border-border text-muted-foreground'
              }`}
            >
              {isSelected ? (
                <CheckCircle2 className="w-3.5 h-3.5 fill-primary text-primary-foreground" />
              ) : (
                <Circle className="w-3.5 h-3.5" />
              )}
            </div>
          </div>
        )}

        {/* Hover Delete Button */}
        {!multiSelect && (
          <div className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              type="button"
              onClick={handleDeleteClick}
              title="Delete startup"
              className="p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all shadow-md cursor-pointer bg-background/95 backdrop-blur-md border border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 2. NEWS ADAPTABLE HORIZONTAL RECTANGLE (MATCHING NEW WIREFRAME DIAGRAM)
  // =========================================================================
  if (routeId === 'news') {
    return (
      <div
        onClick={handleCardClick}
        className={`group relative rounded-2xl border transition-all duration-300 ease-out overflow-hidden flex flex-row items-center p-3.5 sm:p-4 gap-3.5 select-none min-h-[96px] cursor-pointer ${
          isPreviewSelected
            ? 'border-primary ring-2 ring-primary/50 bg-primary/10 shadow-md shadow-primary/15 sm:translate-x-1'
            : isSelected
            ? 'border-primary ring-2 ring-primary/40 bg-primary/5 shadow-md shadow-primary/10'
            : 'border-border bg-card hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5'
        }`}
      >
        {/* Left: News Thumbnail Image */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-muted/40 border border-border overflow-hidden flex items-center justify-center shrink-0">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={details.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <ImageIcon className="w-7 h-7 text-muted-foreground opacity-40" />
          )}
        </div>

        {/* Right: Heading & Sub-heading (Multi-line adjustable vertical height) */}
        <div className="min-w-0 flex-1 space-y-1 pr-6">
          <div className="flex items-start justify-between gap-1.5">
            <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors leading-snug">
              {details.title}
            </h3>
            <span className="text-[10px] font-mono text-muted-foreground shrink-0 bg-accent/60 px-1.5 py-0.5 rounded">
              #{item.id}
            </span>
          </div>

          {details.subtitle && (
            <p className="text-xs text-muted-foreground font-medium leading-normal line-clamp-2">
              {details.subtitle}
            </p>
          )}

          {details.body && !details.subtitle && (
            <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-normal">
              {details.body}
            </p>
          )}

          {item.published_date && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70 font-mono pt-0.5">
              <Calendar className="w-3 h-3" />
              <span>{new Date(item.published_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Multi-Select Checkbox Indicator */}
        {multiSelect && (
          <div className="absolute top-2.5 right-2.5 z-20">
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-background/90 backdrop-blur-md border border-border text-muted-foreground'
              }`}
            >
              {isSelected ? (
                <CheckCircle2 className="w-3.5 h-3.5 fill-primary text-primary-foreground" />
              ) : (
                <Circle className="w-3.5 h-3.5" />
              )}
            </div>
          </div>
        )}

        {/* Hover Delete Button */}
        {!multiSelect && (
          <div className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              type="button"
              onClick={handleDeleteClick}
              title="Delete article"
              className="p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all shadow-md cursor-pointer bg-background/95 backdrop-blur-md border border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 3. STANDARD 5-COLUMN CARD (GALLERY & TEAM)
  // =========================================================================
  return (
    <div
      onClick={handleCardClick}
      className={`group relative rounded-2xl border transition-all duration-300 ease-out overflow-hidden flex flex-col justify-between select-none ${
        multiSelect ? 'cursor-pointer' : 'hover:-translate-y-0.5'
      } ${
        isSelected
          ? 'border-primary ring-2 ring-primary/40 bg-primary/5 shadow-md shadow-primary/10'
          : 'border-border bg-card hover:border-primary/50 hover:shadow-lg'
      }`}
    >
      {/* Media / Thumbnail Section */}
      <div className="relative w-full aspect-16/10 bg-muted/40 overflow-hidden flex items-center justify-center border-b border-border">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={details.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground gap-1 p-3 text-center">
            <ImageIcon className="w-6 h-6 opacity-40" />
            <span className="text-[10px] font-mono opacity-60">No Image</span>
          </div>
        )}

        {/* Multi-Select Checkbox Indicator */}
        {multiSelect && (
          <div className="absolute top-2 right-2 z-20">
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-background/90 backdrop-blur-md border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {isSelected ? (
                <CheckCircle2 className="w-3.5 h-3.5 fill-primary text-primary-foreground" />
              ) : (
                <Circle className="w-3.5 h-3.5" />
              )}
            </div>
          </div>
        )}

        {/* Hover Delete Button */}
        {!multiSelect && (
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              type="button"
              onClick={handleDeleteClick}
              title="Delete item"
              className="px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all shadow-md cursor-pointer bg-background/95 backdrop-blur-md border border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Content Details */}
      <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-1.5">
            <h3 className="font-bold text-xs sm:text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {details.title}
            </h3>
            <span className="text-[9px] font-mono text-muted-foreground shrink-0 bg-accent/60 px-1.5 py-0.5 rounded">
              #{item.id}
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground line-clamp-1 font-medium">
            {details.subtitle}
          </p>

          {details.body && (
            <p className="text-[11px] text-muted-foreground/80 line-clamp-2 leading-snug pt-0.5">
              {details.body}
            </p>
          )}
        </div>

        {/* Footer Meta */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1 truncate">
            <Calendar className="w-3 h-3 text-muted-foreground/70 shrink-0" />
            <span className="truncate">
              {item.created_at || item.published_date
                ? new Date(item.created_at || item.published_date).toLocaleDateString()
                : 'Active'}
            </span>
          </span>
          {details.categoryDisplay && (
            <span className="text-primary font-medium shrink-0 ml-1 text-[9px] uppercase px-1.5 py-0.5 bg-primary/10 rounded">
              {details.categoryDisplay}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
