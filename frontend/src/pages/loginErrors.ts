import { ApiError } from '../services/api';

// Turns a failed login into the message shown above the form
export const describeLoginError = (err: unknown): string => {
  if (!(err instanceof ApiError)) {
    return 'Something went wrong. Please try again.';
  }
  switch (err.code) {
    case 'INVALID_CREDENTIALS':
      return 'Email or password is incorrect.';
    case 'VALIDATION_ERROR':
      return 'Please fix the highlighted fields.';
    case 'TOO_MANY_REQUESTS':
      return 'Too many sign-in attempts. Please wait a few minutes and try again.';
    case 'NETWORK_ERROR':
      return err.message;
    default:
      return 'Something went wrong on our side. Please try again in a moment.';
  }
};
