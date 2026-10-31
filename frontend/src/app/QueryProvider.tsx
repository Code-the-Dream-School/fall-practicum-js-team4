import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../context/useAuth';
import { createQueryClient } from './queryClient';

interface QueryProviderProps {
  children: ReactNode;
  // Tests pass 0 so retries don't wait
  retryDelay?: number;
}

// TanStack Query for the whole app, wired to auth. Must sit inside AuthProvider.
export function QueryProvider({ children, retryDelay }: QueryProviderProps) {
  const { status, expireSession } = useAuth();

  // expireSession never changes (useCallback with no deps), so the client can
  // be created once with it
  const [queryClient] = useState(() =>
    createQueryClient({ onSessionExpired: expireSession, retryDelay }),
  );

  // Signed out (logout or expired session): forget every cached response, so
  // the next person on this computer never sees the previous user's data.
  // Only after being signed in: a visitor who never signed in keeps public data
  // that loaded while the first sign-in check was still running.
  const previousStatus = useRef(status);
  useEffect(() => {
    if (
      previousStatus.current === 'authenticated' &&
      status === 'unauthenticated'
    ) {
      queryClient.clear();
    }
    previousStatus.current = status;
  }, [status, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
