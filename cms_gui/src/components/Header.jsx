import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';

export default function Header({
  sidebarOpen,
  setSidebarOpen,
  activeRouteName,
}) {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 w-full h-16 border-b border-border bg-card/90 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between transition-colors select-none">
      {/* Left Section: Minimal Collapse Button + Logo 1 + Logo 2 */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Sleek Minimal Collapse Button (No bulky outer box) */}
        <button
          type="button"
          onClick={() => setSidebarOpen((prev) => !prev)}
          title={sidebarOpen ? 'Collapse Navigation' : 'Expand Navigation'}
          className="p-2 rounded-lg hover:bg-accent text-foreground hover:text-primary transition-colors cursor-pointer flex items-center justify-center shrink-0"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-5 h-5" />
          ) : (
            <PanelLeftOpen className="w-5 h-5" />
          )}
        </button>

        {/* 1st Logo Box: Pure logo1.png (No text) */}
        <div className="flex items-center justify-center h-10 px-2.5 py-1 rounded-xl border border-border bg-background/95 hover:border-primary/40 transition-all shadow-2xs shrink-0">
          <img
            src="/logo1.png"
            alt="Logo 1"
            className="h-7 w-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* 2nd Logo Box: logo2.jpg */}
        <div className="flex items-center justify-center h-10 px-2.5 py-1 rounded-xl border border-border bg-background/95 hover:border-primary/40 transition-all shadow-2xs shrink-0">
          <img
            src="/logo2.jpg"
            alt="Logo 2"
            className="h-7 w-auto rounded object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* Current Section / Route Breadcrumb */}
        {activeRouteName && (
          <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground pl-3 border-l border-border">
            <span>Route:</span>
            <span className="font-semibold text-foreground bg-accent/70 px-2 py-0.5 rounded-md">
              {activeRouteName}
            </span>
          </div>
        )}
      </div>

      {/* Right Section: Sleek Minimal Theme Toggle + Minimal Logout Symbol */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Sleek Minimal Theme Switcher (No bulky outer box) */}
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-lg hover:bg-accent text-foreground hover:text-primary transition-colors cursor-pointer flex items-center justify-center shrink-0"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-primary" />
          ) : (
            <Moon className="w-5 h-5 text-primary" />
          )}
        </button>

        {/* Sleek Minimal Logout Symbol Button (No text, symbol only) */}
        <button
          type="button"
          onClick={logout}
          title="Sign Out"
          className="p-2 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors cursor-pointer flex items-center justify-center shrink-0"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
