import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { describeApiError } from './describeApiError';

const apiError = (status: number, code: string) =>
  new ApiError(status, code, 'raw');

describe('describeApiError', () => {
  it.each([
    [0, 'NETWORK_ERROR', 'network', true],
    [401, 'UNAUTHENTICATED', 'unauthenticated', false],
    [403, 'FORBIDDEN', 'forbidden', false],
    [404, 'NOT_FOUND', 'not-found', false],
    [429, 'TOO_MANY_REQUESTS', 'rate-limited', false],
    [500, 'INTERNAL_ERROR', 'server', true],
    [502, 'PHOTO_UPLOAD_FAILED', 'server', true],
    [400, 'VALIDATION_ERROR', 'client', false],
    [409, 'EMAIL_TAKEN', 'client', false],
  ])('%i %s is a %s error (retryable: %s)', (status, code, kind, retryable) => {
    expect(describeApiError(apiError(status, code))).toMatchObject({
      kind,
      retryable,
    });
  });

  it('chooses by code, not status', () => {
    // A 401 that isn't about the session (e.g. a wrong password) is not "session expired"
    expect(describeApiError(apiError(401, 'INVALID_CREDENTIALS')).kind).toBe(
      'client',
    );
  });

  it('gives a reference to match with server logs, except for network errors', () => {
    expect(describeApiError(apiError(500, 'INTERNAL_ERROR')).reference).toBe(
      'INTERNAL_ERROR · 500',
    );
    expect(
      describeApiError(apiError(0, 'NETWORK_ERROR')).reference,
    ).toBeUndefined();
  });

  it('treats an error that is not from the API as a bug: no retry', () => {
    expect(describeApiError(new TypeError('x is undefined'))).toMatchObject({
      kind: 'unknown',
      retryable: false,
    });
  });
});
