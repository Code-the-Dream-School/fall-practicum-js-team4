import { ApiError } from './api';

export type ErrorKind =
  | 'network'
  | 'unauthenticated'
  | 'forbidden'
  | 'not-found'
  | 'rate-limited'
  | 'server'
  | 'client'
  | 'unknown';

export interface DescribedError {
  kind: ErrorKind;
  title: string;
  message: string;
  // Whether trying again can help (network and server errors only)
  retryable: boolean;
  // e.g. "INTERNAL_ERROR · 500", to match the error with server logs
  reference?: string;
}

// The team's agreed mapping from an API failure to what the user sees.
// Picks by error code (stable, see docs/auth.md), falling back to the status.
export const describeApiError = (err: unknown): DescribedError => {
  if (!(err instanceof ApiError)) {
    // A bug in our own code, not an API answer: retrying won't fix it
    return {
      kind: 'unknown',
      title: 'Something went wrong',
      message: 'Please refresh the page. If it keeps happening, let us know.',
      retryable: false,
    };
  }

  const reference = err.status ? `${err.code} · ${err.status}` : err.code;

  switch (err.code) {
    case 'NETWORK_ERROR':
      return {
        kind: 'network',
        title: "You're offline",
        message:
          "We couldn't reach PawRadar. Check your connection and try again.",
        retryable: true,
      };
    case 'UNAUTHENTICATED':
      return {
        kind: 'unauthenticated',
        title: 'Your session expired',
        message: 'Sign in again to continue.',
        retryable: false,
        reference,
      };
    case 'FORBIDDEN':
      return {
        kind: 'forbidden',
        title: "You don't have access to this",
        message: 'This belongs to another user.',
        retryable: false,
        reference,
      };
    case 'NOT_FOUND':
      return {
        kind: 'not-found',
        title: "This doesn't exist",
        message: 'It may have been removed, or the link is wrong.',
        retryable: false,
        reference,
      };
    case 'TOO_MANY_REQUESTS':
      return {
        kind: 'rate-limited',
        title: 'Too many requests',
        message: 'Please wait a moment and try again.',
        retryable: false,
        reference,
      };
  }

  if (err.status >= 500) {
    return {
      kind: 'server',
      title: 'Something went wrong on our side',
      message: "We couldn't load this right now. Please try again.",
      retryable: true,
      reference,
    };
  }

  // Any other 4xx on data loading means a bug in the request we sent
  return {
    kind: 'client',
    title: "Couldn't load this",
    message: 'Please refresh the page. If it keeps happening, let us know.',
    retryable: false,
    reference,
  };
};
