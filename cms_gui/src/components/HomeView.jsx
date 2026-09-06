import React from 'react';
import { Image, Rocket, Newspaper, Users } from 'lucide-react';

export default function HomeView({ onSelectRoute }) {
  return (
    <div className="w-full min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none">
      <div className="flex flex-col items-center justify-center space-y-8">
        {/* Clean Big Logo (No outer border boxes, no subtext) */}
        <div className="flex items-center justify-center transition-transform duration-300 hover:scale-102">
          <img
            src="/logo1.png"
            alt="Main Logo"
            className="max-h-48 sm:max-h-60 md:max-h-72 w-auto object-contain drop-shadow-md"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* Bottom Quick Navigation Icons (No text) */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onSelectRoute('gallery')}
            title="Gallery Items (/api/gallery/)"
            className="p-3 rounded-2xl border border-border bg-card/80 hover:bg-accent hover:border-primary/50 text-foreground hover:text-primary transition-all cursor-pointer shadow-2xs group"
          >
            <Image className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
          <button
            type="button"
            onClick={() => onSelectRoute('startups')}
            title="Startups (/api/startups/)"
            className="p-3 rounded-2xl border border-border bg-card/80 hover:bg-accent hover:border-primary/50 text-foreground hover:text-primary transition-all cursor-pointer shadow-2xs group"
          >
            <Rocket className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
          <button
            type="button"
            onClick={() => onSelectRoute('news')}
            title="News Updates (/api/news/)"
            className="p-3 rounded-2xl border border-border bg-card/80 hover:bg-accent hover:border-primary/50 text-foreground hover:text-primary transition-all cursor-pointer shadow-2xs group"
          >
            <Newspaper className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
          <button
            type="button"
            onClick={() => onSelectRoute('team')}
            title="Team Members (/api/team/)"
            className="p-3 rounded-2xl border border-border bg-card/80 hover:bg-accent hover:border-primary/50 text-foreground hover:text-primary transition-all cursor-pointer shadow-2xs group"
          >
            <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
