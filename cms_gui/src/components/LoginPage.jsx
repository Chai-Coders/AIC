import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    if (!username.trim() || !password) {
      setError('Please enter your username and password.');
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
        err.status === 401 || err.status === 400
          ? 'That username or password isn’t right. Please try again.'
          : err.message || 'Could not sign in. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-5 text-center">
          <img src="/logo1.png" alt="AIC IIITK" className="h-10 w-auto object-contain dark:brightness-0 dark:invert" />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-foreground">Website Manager</h1>
            <p className="text-sm text-muted-foreground">Sign in to update the AIC IIITK website.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-sm font-medium text-foreground">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              className="field"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="field pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                className="icon-btn absolute right-1 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{loading ? 'Signing in…' : 'Sign in'}</span>
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">Made with love by ChaiCoders</p>
      </div>
    </div>
  );
}
