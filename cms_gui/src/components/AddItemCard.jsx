import React from 'react';
import { Plus } from 'lucide-react';

export default function AddItemCard({ routeName, routeId, onClick }) {
  // 1. STARTUPS: Compact horizontal rectangle in 3-column grid
  if (routeId === 'startups') {
    return (
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        className="group relative rounded-2xl border-2 border-dashed border-border hover:border-primary/60 bg-card/40 hover:bg-primary/5 transition-all duration-200 overflow-hidden flex flex-row items-center p-3.5 sm:p-4 gap-3.5 cursor-pointer min-h-[96px] select-none hover:-translate-y-0.5 hover:shadow-md"
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200 shadow-xs">
          <Plus className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <div className="space-y-0.5 min-w-0 flex-1">
          <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
            Add New Startup
          </h3>
          <p className="text-xs text-muted-foreground font-mono truncate">
            + Create startup record
          </p>
        </div>
      </div>
    );
  }

  // 2. NEWS: Full-width stacked list card
  if (routeId === 'news') {
    return (
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        className="group relative rounded-2xl border-2 border-dashed border-border hover:border-primary/60 bg-card/40 hover:bg-primary/5 transition-all duration-200 overflow-hidden flex flex-col sm:flex-row items-center p-5 sm:p-6 gap-5 cursor-pointer min-h-[140px] select-none hover:-translate-y-0.5 hover:shadow-lg"
      >
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200 shadow-xs">
          <Plus className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>

        <div className="space-y-1 text-center sm:text-left flex-1">
          <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
            Add New Article
          </h3>
          <p className="text-xs text-muted-foreground font-mono">
            Click here to open the creation form and publish a new news update
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-primary/15 border border-primary/30 text-xs font-semibold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
          + Create Article
        </div>
      </div>
    );
  }

  // 3. GALLERY & TEAM: Standard 3-column card
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative rounded-2xl border-2 border-dashed border-border hover:border-primary/60 bg-card/40 hover:bg-primary/5 transition-all duration-200 overflow-hidden flex flex-col items-center justify-center p-6 text-center cursor-pointer min-h-[280px] select-none hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200 shadow-xs">
        <Plus className="w-7 h-7" />
      </div>

      <div className="space-y-1">
        <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
          Add New {routeName.replace(/s$/, '')}
        </h3>
        <p className="text-xs text-muted-foreground font-mono">
          Click to open POST form
        </p>
      </div>

      <div className="mt-4 px-3 py-1 rounded-full bg-accent/80 border border-border text-[11px] font-mono text-muted-foreground group-hover:text-foreground transition-colors">
        + Create Record
      </div>
    </div>
  );
}
