import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Lock, User, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fromPath = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(fromPath, { replace: true });
    }
  }, [isAuthenticated, navigate, fromPath]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both User ID and Password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(username.trim(), password);
      navigate(fromPath, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.message || 'Authentication failed. Please check your credentials and retry.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-background p-4 overflow-hidden select-none">
      {/* Subtle Ambient Glows */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 translate-x-1/2 translate-y-1/2 w-80 h-80 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar with Minimal Theme Switcher (No text) */}
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-lg hover:bg-accent text-foreground transition-all cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-primary" />
          ) : (
            <Moon className="w-5 h-5 text-primary" />
          )}
        </button>
      </div>

      {/* Central Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-2xl p-8 sm:p-10 space-y-7 transition-all">
          {/* Header (Clean borderless logo, no LOGIN title / subtext) */}
          <div className="flex items-center justify-center pb-2">
            <img
              src="/logo1.png"
              alt="Logo"
              className="max-h-20 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          {/* Error Banner with Retry reminder */}
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 flex items-start gap-3 text-destructive animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1 flex-1 leading-relaxed">
                <p className="font-semibold">{error}</p>
                <p className="text-muted-foreground">
                  Please verify your credentials and try again.
                </p>
              </div>
            </div>
          )}

          {/* Form (No labels, clean user id and password placeholders) */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="userId"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="user id"
                autoComplete="username"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background/60 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div className="relative">
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                autoComplete="current-password"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background/60 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer note: with love ChaiCoders */}
          <div className="pt-2 text-center">
            <p className="text-xs text-muted-foreground font-mono">
              with love ChaiCoders
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
