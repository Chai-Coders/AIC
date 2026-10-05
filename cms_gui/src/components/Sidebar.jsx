import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ExternalLink, LogOut, Moon, Sun, X } from 'lucide-react';
import { ROUTES, SITE_URL } from '../routes';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Sidebar({ isOpen, setIsOpen }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  const close = () => setIsOpen(false);

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      {/* Backdrop for the phone-sized slide-out menu */}
      {isOpen && (
        <div
          onClick={close}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-black/40 md:hidden animate-in fade-in duration-150"
        />
      )}

      <aside
        aria-label="Main menu"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 md:sticky md:top-0 md:h-dvh md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <img
            src="/logo1.png"
            alt="AIC IIITK"
            className="h-7 w-auto object-contain dark:brightness-0 dark:invert"
          />
          <button type="button" onClick={close} aria-label="Close menu" className="icon-btn -mr-2 md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {ROUTES.map((route) => {
            const Icon = route.icon;
            return (
              <NavLink
                key={route.path}
                to={route.path}
                end={route.path === '/'}
                onClick={close}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span>{route.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-border p-3">
          {SITE_URL && (
            <a
              href={SITE_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ExternalLink className="h-[18px] w-[18px]" />
              <span>View website</span>
            </a>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>

          <div className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold uppercase text-accent-foreground">
              {(user?.username || '?').charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{user?.username || 'Signed in'}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              title="Sign out"
              aria-label="Sign out"
              className="icon-btn hover:text-destructive"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
