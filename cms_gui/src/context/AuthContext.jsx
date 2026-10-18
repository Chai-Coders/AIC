import { createContext, useContext, useCallback, useMemo } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';

const AuthContext = createContext();

// Admin sessions are managed by Convex Auth, which stores and refreshes the
// tokens itself. Accounts are created from the command line (admin.ts).
export function AuthProvider({ children }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const user = useQuery(anyApi.users.me, isAuthenticated ? {} : 'skip');

  const login = useCallback(
    (email, password) => signIn('password', { email, password, flow: 'signIn' }),
    [signIn]
  );

  const logout = useCallback(() => signOut(), [signOut]);

  const value = useMemo(
    () => ({
      user: user ?? null,
      isAuthenticated,
      loading: isLoading,
      login,
      logout,
    }),
    [user, isAuthenticated, isLoading, login, logout]
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
