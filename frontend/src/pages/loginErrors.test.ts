import { describe, expect, it } from 'vitest';
import { ApiError } from '../services/api';
import { describeLoginError } from './loginErrors';

describe('describeLoginError', () => {
  it.each([
    ['INVALID_CREDENTIALS', 401, 'Email or password is incorrect.'],
    ['VALIDATION_ERROR', 400, 'Please fix the highlighted fields.'],
    ['TOO_MANY_REQUESTS', 429, /too many sign-in attempts/i],
    ['INTERNAL_ERROR', 500, /something went wrong on our side/i],
    ['SOME_NEW_CODE', 418, /something went wrong on our side/i],
  ])('describes %s', (code, status, expected) => {
    expect(describeLoginError(new ApiError(status, code, 'raw'))).toMatch(
      expected,
    );
  });

  it('shows the network error message as is', () => {
    const err = new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server.');
    expect(describeLoginError(err)).toBe('Could not reach the server.');
  });

  it.each([
    ['a plain Error', new Error('boom')],
    ['a thrown string', 'boom'],
    ['undefined', undefined],
  ])('gives a generic message for %s', (_, err) => {
    expect(describeLoginError(err)).toBe(
      'Something went wrong. Please try again.',
    );
  });
});
