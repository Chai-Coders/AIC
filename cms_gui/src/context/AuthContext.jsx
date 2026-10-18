import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api, getAuthToken, clearTokens, SESSION_EXPIRED_EVENT } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('cms_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => getAuthToken());
  // Only block the UI on startup when there is a stored session to verify.
  const [loading, setLoading] = useState(() => !!getAuthToken());

  // Verify a stored session once on startup.
  useEffect(() => {
    if (!getAuthToken()) return;
    let cancelled = false;

    api.auth
      .getMe()
      .then((userData) => {
        if (!cancelled) setUser(userData);
      })
      .catch((err) => {
        if (cancelled) return;
        // Only drop the session when the backend actually rejected it; a network
        // blip or server error should not log the admin out.
        if (err.status === 401 || err.status === 403) {
          console.warn('Session expired or invalid:', err);
          clearTokens();
          setUser(null);
          setToken(null);
        } else {
          console.warn('Could not verify session, keeping cached user:', err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Any request that fails auth (and cannot refresh) signs the user out of the UI.
  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await api.auth.login(username, password);
    setToken(data.access);
    setUser(data.user || { username });
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      setToken(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!token,
      loading,
      login,
      logout,
    }),
    [user, token, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
