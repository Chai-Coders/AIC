import React from 'react';
import { Sparkles, ArrowLeft, Layers, Terminal } from 'lucide-react';

export default function HomeView({ onOpenSidebar, onSelectRoute }) {
  return (
    <div className="w-full min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center p-6 text-center">
      {/* Central Big Logo Placeholder as requested */}
      <div className="w-full max-w-2xl flex flex-col items-center justify-center space-y-6">
        {/* Placeholder container for the future big logo */}
        <div className="relative group w-64 h-64 sm:w-80 sm:h-80 rounded-3xl border-2 border-dashed border-border hover:border-primary/50 bg-card/40 backdrop-blur-sm flex flex-col items-center justify-center p-8 transition-all duration-300">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
            <Sparkles className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-widest text-foreground">
              Big Logo Canvas
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              [Reserved for Brand Logo Asset]
            </p>
          </div>

          <div className="absolute -bottom-3 px-3 py-1 rounded-full bg-secondary border border-border text-[10px] font-mono text-secondary-foreground shadow-xs">
            Claude Theme • Ready
          </div>
        </div>

        {/* Minimal subtitle & quick route links */}
        <div className="space-y-3 max-w-md">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            CMS Content Dashboard
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Welcome to the administration studio. Open the sidebar or select any endpoint from the navigation panel to fetch and manage items.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={() => onSelectRoute('gallery')}
              className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-medium text-foreground transition-all cursor-pointer shadow-2xs"
            >
              /api/gallery/
            </button>
            <button
              onClick={() => onSelectRoute('startups')}
              className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-medium text-foreground transition-all cursor-pointer shadow-2xs"
            >
              /api/startups/
            </button>
            <button
              onClick={() => onSelectRoute('news')}
              className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-medium text-foreground transition-all cursor-pointer shadow-2xs"
            >
              /api/news/
            </button>
            <button
              onClick={() => onSelectRoute('team')}
              className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-medium text-foreground transition-all cursor-pointer shadow-2xs"
            >
              /api/team/
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
