import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  LogOut,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  ShieldCheck,
} from 'lucide-react';

export default function Header({
  sidebarOpen,
  setSidebarOpen,
  multiSelect,
  setMultiSelect,
  activeRouteName,
}) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 w-full h-16 border-b border-border bg-card/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Left Section: Collapse Button + Logo 1 + Logo 2 as in wireframe */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Collapse Button */}
        <button
          onClick={() => setSidebarOpen((prev) => !prev)}
          title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          className="p-2 rounded-lg border border-border bg-background/80 hover:bg-accent text-foreground hover:text-primary transition-all cursor-pointer flex items-center justify-center shadow-xs"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-5 h-5" />
          ) : (
            <PanelLeftOpen className="w-5 h-5" />
          )}
        </button>

        {/* Logo 1 Box (Wireframe logo1) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background/80 hover:border-primary/40 transition-colors shadow-2xs">
          <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold tracking-wide uppercase text-foreground">
            AIC CMS
          </span>
        </div>

        {/* Logo 2 Box (Wireframe logo2) */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background/80 hover:border-primary/40 transition-colors shadow-2xs">
          <div className="w-5 h-5 rounded bg-secondary flex items-center justify-center text-secondary-foreground font-semibold text-xs">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            STUDIO
          </span>
        </div>

        {/* Active Route indicator on medium screens */}
        {activeRouteName && (
          <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground pl-2 border-l border-border">
            <span>Section:</span>
            <span className="font-semibold text-foreground bg-accent/60 px-2 py-0.5 rounded">
              {activeRouteName}
            </span>
          </div>
        )}
      </div>

      {/* Right Section: Multi-Select Toggle + Theme Switcher + Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Multi-Select Toggle Button (Wireframe multi-select) */}
        <button
          onClick={() => setMultiSelect((prev) => !prev)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer shadow-xs ${
            multiSelect
              ? 'border-primary bg-primary text-primary-foreground shadow-primary/20'
              : 'border-border bg-background/80 text-foreground hover:bg-accent'
          }`}
          title="Toggle Multi-Selection Mode"
        >
          {multiSelect ? (
            <CheckSquare className="w-4 h-4" />
          ) : (
            <Square className="w-4 h-4 text-muted-foreground" />
          )}
          <span>multi-select</span>
          <span
            className={`w-2 h-2 rounded-full ${
              multiSelect ? 'bg-primary-foreground animate-ping' : 'bg-muted'
            }`}
          />
        </button>

        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-lg border border-border bg-background/80 hover:bg-accent text-foreground transition-all cursor-pointer shadow-xs"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-primary" />
          ) : (
            <Moon className="w-4 h-4 text-primary" />
          )}
        </button>

        {/* User Badge & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          {user && (
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium text-foreground">{user.username}</span>
            </div>
          )}
          <button
            onClick={logout}
            title="Sign Out"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-background/80 hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive text-muted-foreground text-xs font-medium transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
