import React, { useState } from 'react';
import {
  Trash2,
  CheckCircle2,
  Circle,
  ExternalLink,
  Calendar,
  Tag,
  User,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';

export default function CardItem({
  item,
  routeId,
  multiSelect,
  isSelected,
  onToggleSelect,
  onDelete,
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
          tag: 'Gallery',
          body: null,
          link: null,
        };
      case 'startups':
        return {
          title: item.name || `Startup #${item.id}`,
          subtitle: item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Startup Venture',
          tag: 'Startup',
          body: item.description,
          link: item.website_url,
        };
      case 'news':
        return {
          title: item.title || `News #${item.id}`,
          subtitle: item.subtitle || (item.published_date ? new Date(item.published_date).toLocaleDateString() : 'News Update'),
          tag: 'News',
          body: item.content,
          link: null,
        };
      case 'team':
        return {
          title: item.name || `Team Member #${item.id}`,
          subtitle: item.role || 'Member',
          tag: item.category ? item.category.toUpperCase() : 'Team',
          body: item.bio,
          link: null,
        };
      default:
        return {
          title: item.title || item.name || item.subtext || `Item #${item.id}`,
          subtitle: 'Content item',
          tag: 'CMS',
          body: item.description || item.bio || item.content,
          link: null,
        };
    }
  };

  const imageUrl = getImageUrl(item);
  const details = getItemDetails(item, routeId);

  const handleDeleteClick = async (e) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    try {
      setIsDeleting(true);
      await onDelete(item.id);
    } catch (err) {
      console.error('Delete failed:', err);
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleCardClick = () => {
    if (multiSelect) {
      onToggleSelect(item.id);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseLeave={() => setConfirmDelete(false)}
      className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between select-none ${
        multiSelect ? 'cursor-pointer' : 'hover:-translate-y-0.5'
      } ${
        isSelected
          ? 'border-primary ring-2 ring-primary/40 bg-primary/5 shadow-md shadow-primary/10'
          : 'border-border bg-card hover:border-primary/50 hover:shadow-lg'
      }`}
    >
      {/* Top Banner / Image Section */}
      <div className="relative w-full aspect-16/10 bg-muted/40 overflow-hidden flex items-center justify-center border-b border-border">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={details.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              // fallback if broken image
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground gap-1.5 p-4 text-center">
            <ImageIcon className="w-8 h-8 opacity-40" />
            <span className="text-[11px] font-mono opacity-60">No Image Asset</span>
          </div>
        )}

        {/* Category / Schema Tag */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-background/90 backdrop-blur-md border border-border text-foreground shadow-xs">
            {details.tag}
          </span>
        </div>

        {/* Multi-Select Checkbox Indicator (Always visible when multiSelect enabled) */}
        {multiSelect && (
          <div className="absolute top-2.5 right-2.5 z-20">
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-background/90 backdrop-blur-md border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {isSelected ? (
                <CheckCircle2 className="w-4 h-4 fill-primary text-primary-foreground" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </div>
          </div>
        )}

        {/* Hover Delete Button (Wireframe: 'cms items, on hover delete button appears') */}
        {!multiSelect && (
          <div className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              type="button"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              title={confirmDelete ? 'Click again to confirm deletion' : 'Delete item'}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                confirmDelete
                  ? 'bg-destructive text-destructive-foreground animate-pulse'
                  : 'bg-background/95 backdrop-blur-md border border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground'
              }`}
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>{confirmDelete ? 'Confirm?' : 'Delete'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Card Content Details */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {details.title}
            </h3>
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
              #{item.id}
            </span>
          </div>

          <p className="text-xs text-muted-foreground line-clamp-1 font-medium">
            {details.subtitle}
          </p>

          {details.body && (
            <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed pt-1">
              {details.body}
            </p>
          )}
        </div>

        {/* Footer Meta / Links */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-muted-foreground/70" />
            {item.created_at || item.published_date
              ? new Date(item.created_at || item.published_date).toLocaleDateString()
              : 'Active'}
          </span>

          {details.link && (
            <a
              href={details.link}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <span>Visit</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
