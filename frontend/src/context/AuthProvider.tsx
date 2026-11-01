import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import type { AuthStatus } from './AuthContext';
import { getCurrentUser, logout } from '../services/authApi';
import type { User } from '../services/authApi';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [signedOutByUser, setSignedOutByUser] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // The session lives in an httpOnly cookie, so ask the backend who is
  // signed in. Any failure (401, network) means "signed out".
  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((current) => {
        if (cancelled) return;
        setUser(current);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!cancelled) setStatus('unauthenticated');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setSession = useCallback((next: User) => {
    setUser(next);
    setStatus('authenticated');
    setSignedOutByUser(false);
    setSessionExpired(false);
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    setUser(null);
    setSignedOutByUser(true);
    setSessionExpired(false);
    setStatus('unauthenticated');
  }, []);

  // Not a deliberate logout: protected pages keep remembering where the user
  // was, so signing in again returns them there
  const expireSession = useCallback(() => {
    setUser(null);
    setSignedOutByUser(false);
    setSessionExpired(true);
    setStatus('unauthenticated');
  }, []);

  const clearSignedOutByUser = useCallback(() => {
    setSignedOutByUser(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      signedOutByUser,
      sessionExpired,
      setSession,
      signOut,
      expireSession,
      clearSignedOutByUser,
    }),
    [
      user,
      status,
      signedOutByUser,
      sessionExpired,
      setSession,
      signOut,
      expireSession,
      clearSignedOutByUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
