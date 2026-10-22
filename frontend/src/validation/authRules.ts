import type { RegisterOptions } from 'react-hook-form';
import type { LoginInput } from '../services/authApi';

// Same limits as backend/src/validators/auth.validators.js (loginSchema), so
// the form rejects what the API would reject without a round trip.
const EMAIL_MAX = 254;
const PASSWORD_MAX = 128;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const loginRules: {
  [K in 'email' | 'password']: RegisterOptions<LoginInput, K>;
} = {
  email: {
    setValueAs: (v: string) => v.trim(),
    required: 'Email is required',
    maxLength: {
      value: EMAIL_MAX,
      message: `Email must be at most ${EMAIL_MAX} characters`,
    },
    pattern: { value: EMAIL_PATTERN, message: 'Enter a valid email address' },
  },
  password: {
    // No minimum length on login: the backend only checks the stored hash
    required: 'Password is required',
    maxLength: {
      value: PASSWORD_MAX,
      message: `Password must be at most ${PASSWORD_MAX} characters`,
    },
  },
};
