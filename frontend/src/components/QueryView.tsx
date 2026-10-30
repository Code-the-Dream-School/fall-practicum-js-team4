import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { ErrorState } from './ErrorState';
import { MAX_RETRIES } from '../app/queryClient';
import { ApiError } from '../services/api';
import { colors } from '../styles/theme';

interface QueryViewProps<T> {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  // Where the data shows: the whole page, or one card/section of it
  variant?: 'page' | 'inline';
  loading?: ReactNode;
}

// When the browser itself is offline, TanStack Query doesn't fail the request:
// it pauses it and sends it as soon as the connection is back. Shown like a
// network error, but without Retry (it can't help, and loading resumes alone).
const BROWSER_OFFLINE = new ApiError(0, 'NETWORK_ERROR', "You're offline");

// Applies the agreed rules to one useQuery result:
// - loading (and "trying again" while retrying)
// - offline before anything loaded: "loads when you're back online"
// - an error with nothing on screen: ErrorState as page or inline
// - an error or offline while older data is on screen: keep it, add a banner
export function QueryView<T>({
  query,
  children,
  variant = 'page',
  loading,
}: QueryViewProps<T>) {
  const { data, error, isPending, failureCount, fetchStatus, refetch } = query;
  const retry = () => void refetch();
  const paused = fetchStatus === 'paused';

  if (paused && data === undefined) {
    return (
      <ErrorState
        error={BROWSER_OFFLINE}
        variant={variant}
        role="status"
        message="This will load automatically when you're back online."
      />
    );
  }

  if (isPending && !error) {
    return (
      <p role="status" style={{ color: colors.textMuted }}>
        {failureCount > 0
          ? `Still loading… trying again (${failureCount} of ${MAX_RETRIES}).`
          : (loading ?? 'Loading…')}
      </p>
    );
  }

  if (data === undefined) {
    return <ErrorState error={error} onRetry={retry} variant={variant} />;
  }

  return (
    <>
      {paused ? (
        <ErrorState error={BROWSER_OFFLINE} variant="banner" />
      ) : (
        error && <ErrorState error={error} onRetry={retry} variant="banner" />
      )}
      {children(data)}
    </>
  );
}
