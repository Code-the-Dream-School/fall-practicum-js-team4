import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../services/api';
import { MAX_RETRIES, createQueryClient, shouldRetry } from './queryClient';

const apiError = (status: number, code: string) =>
  new ApiError(status, code, 'raw');

describe('shouldRetry', () => {
  it.each([
    ['a network error', apiError(0, 'NETWORK_ERROR')],
    ['a server error', apiError(500, 'INTERNAL_ERROR')],
  ])('retries %s up to the limit', (_, error) => {
    expect(shouldRetry(0, error)).toBe(true);
    expect(shouldRetry(MAX_RETRIES - 1, error)).toBe(true);
    expect(shouldRetry(MAX_RETRIES, error)).toBe(false);
  });

  it.each([
    ['401', apiError(401, 'UNAUTHENTICATED')],
    ['403', apiError(403, 'FORBIDDEN')],
    ['404', apiError(404, 'NOT_FOUND')],
    ['429', apiError(429, 'TOO_MANY_REQUESTS')],
  ])('never retries %s', (_, error) => {
    expect(shouldRetry(0, error)).toBe(false);
  });
});

describe('createQueryClient', () => {
  const setup = () => {
    const onSessionExpired = vi.fn();
    const client = createQueryClient({ onSessionExpired, retryDelay: 0 });
    return { client, onSessionExpired };
  };

  it('retries a failing GET twice, then gives up', async () => {
    const { client } = setup();
    const queryFn = vi.fn().mockRejectedValue(apiError(500, 'INTERNAL_ERROR'));

    await expect(
      client.fetchQuery({ queryKey: ['x'], queryFn }),
    ).rejects.toThrow();

    expect(queryFn).toHaveBeenCalledTimes(1 + MAX_RETRIES);
  });

  it('does not retry a 404', async () => {
    const { client } = setup();
    const queryFn = vi.fn().mockRejectedValue(apiError(404, 'NOT_FOUND'));

    await expect(
      client.fetchQuery({ queryKey: ['x'], queryFn }),
    ).rejects.toThrow();

    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('never retries a mutation, even after a server error', async () => {
    const { client } = setup();
    const mutationFn = vi
      .fn()
      .mockRejectedValue(apiError(500, 'INTERNAL_ERROR'));

    await expect(
      client
        .getMutationCache()
        .build(client, { mutationFn })
        .execute(undefined),
    ).rejects.toThrow();

    expect(mutationFn).toHaveBeenCalledTimes(1);
  });

  it('reports an expired session from a query or a mutation', async () => {
    const { client, onSessionExpired } = setup();
    const expired = apiError(401, 'UNAUTHENTICATED');

    await client
      .fetchQuery({ queryKey: ['x'], queryFn: () => Promise.reject(expired) })
      .catch(() => {});
    await client
      .getMutationCache()
      .build(client, { mutationFn: () => Promise.reject(expired) })
      .execute(undefined)
      .catch(() => {});

    expect(onSessionExpired).toHaveBeenCalledTimes(2);
  });

  it('ignores other errors for the session', async () => {
    const { client, onSessionExpired } = setup();

    await client
      .fetchQuery({
        queryKey: ['x'],
        queryFn: () => Promise.reject(apiError(403, 'FORBIDDEN')),
      })
      .catch(() => {});

    expect(onSessionExpired).not.toHaveBeenCalled();
  });
});
