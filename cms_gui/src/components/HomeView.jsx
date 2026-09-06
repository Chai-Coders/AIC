import React from 'react';
import { Sparkles, Image, Rocket, Newspaper, Users, Terminal } from 'lucide-react';

export default function HomeView({ onOpenSidebar, onSelectRoute }) {
  return (
    <div className="w-full min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none">
      <div className="w-full max-w-2xl flex flex-col items-center justify-center space-y-6">
        {/* Central Big Logo Container matching Wireframe */}
        <div className="relative group w-72 sm:w-96 rounded-3xl border-2 border-dashed border-border hover:border-primary/50 bg-card/60 backdrop-blur-md flex flex-col items-center justify-center p-8 sm:p-10 transition-all duration-300 shadow-xl">
          {/* Authentic Logo Image Asset */}
          <div className="w-full flex items-center justify-center mb-4 p-3 rounded-2xl bg-background/80 border border-border group-hover:scale-105 transition-transform duration-300 shadow-xs">
            <img
              src="/logo1.png"
              alt="AIC IIITK Main Logo"
              className="max-h-24 sm:max-h-28 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold tracking-wider uppercase text-foreground">
              AIC IIITK FOUNDATION
            </h2>
            <p className="text-xs text-muted-foreground font-mono">
              Atal Incubation Centre • CMS Administration Studio
            </p>
          </div>

          <div className="absolute -bottom-3 px-3.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-[11px] font-mono text-primary shadow-xs">
            Claude OKLCH Theme • Live
          </div>
        </div>

        {/* Action description & quick endpoint buttons */}
        <div className="space-y-3 max-w-lg pt-2">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Select a route from the collapsible sidebar or use the quick access links below to fetch and manage your live database records.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={() => onSelectRoute('gallery')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/40 text-xs font-medium text-foreground transition-all cursor-pointer shadow-2xs"
            >
              <Image className="w-3.5 h-3.5 text-primary" />
              <span>Gallery Items</span>
            </button>
            <button
              onClick={() => onSelectRoute('startups')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/40 text-xs font-medium text-foreground transition-all cursor-pointer shadow-2xs"
            >
              <Rocket className="w-3.5 h-3.5 text-primary" />
              <span>Startups</span>
            </button>
            <button
              onClick={() => onSelectRoute('news')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/40 text-xs font-medium text-foreground transition-all cursor-pointer shadow-2xs"
            >
              <Newspaper className="w-3.5 h-3.5 text-primary" />
              <span>News Updates</span>
            </button>
            <button
              onClick={() => onSelectRoute('team')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/40 text-xs font-medium text-foreground transition-all cursor-pointer shadow-2xs"
            >
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>Team Members</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
