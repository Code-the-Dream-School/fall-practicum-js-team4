import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '../services/api';
import { describeApiError } from '../services/describeApiError';

// Automatic retries for a failed GET before showing an error
export const MAX_RETRIES = 2;

// Retry only when it can help (network and server errors), and only twice
export const shouldRetry = (failureCount: number, error: unknown) =>
  failureCount < MAX_RETRIES && describeApiError(error).retryable;

const isSessionExpired = (error: unknown) =>
  error instanceof ApiError && error.code === 'UNAUTHENTICATED';

interface QueryClientOptions {
  // Called once when any query or mutation finds the session has expired
  onSessionExpired: () => void;
  // Wait between retries; tests pass 0 (default: TanStack's 1s, 2s, ...)
  retryDelay?: number;
}

export const createQueryClient = ({
  onSessionExpired,
  retryDelay,
}: QueryClientOptions) => {
  const onError = (error: unknown) => {
    if (isSessionExpired(error)) onSessionExpired();
  };

  return new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        ...(retryDelay !== undefined && { retryDelay }),
      },
      // POST/PATCH/DELETE change data: retrying could create a report twice
      mutations: { retry: false },
    },
  });
};
