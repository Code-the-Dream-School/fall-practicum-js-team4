import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { ErrorState } from './ErrorState';
import { MAX_RETRIES } from '../app/queryClient';
import { colors } from '../styles/theme';

interface QueryViewProps<T> {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  // Where the data shows: the whole page, or one card/section of it
  variant?: 'page' | 'inline';
  loading?: ReactNode;
}

// Applies the agreed rules to one useQuery result:
// - loading (and "trying again" while retrying)
// - an error with nothing on screen: ErrorState as page or inline
// - an error while older data is on screen: keep the data, add a banner
export function QueryView<T>({
  query,
  children,
  variant = 'page',
  loading,
}: QueryViewProps<T>) {
  const { data, error, isPending, failureCount, refetch } = query;
  const retry = () => void refetch();

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
      {error && <ErrorState error={error} onRetry={retry} variant="banner" />}
      {children(data)}
    </>
  );
}
