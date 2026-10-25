import { useState } from 'react';

import { useForm } from 'react-hook-form';
import type { RegisterInput } from '../../../services/authApi';

import { useAuth } from '../../../context/useAuth';
import { register as registerUser } from '../../../services/authApi';

import { ApiError } from '../../../services/api';

type SignupFormValues = RegisterInput & {
  confirmPassword: string;
};

type Feedback = {
  type: 'error' | 'success';
  message: string;
} | null;

export function SignupForm() {
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>();

  const { setSession } = useAuth();

  const [feedback, setFeedback] = useState<Feedback>(null);

  const onSubmit = async (values: SignupFormValues) => {
    setFeedback(null);

    try {
      const user = await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
      });

      setSession(user);
      setFeedback({
        type: 'success',
        message: 'Account created successfully',
      });
    } catch (error: unknown) {
      if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') {
        for (const { field, message } of error.details) {
          if (field === 'name' || field === 'email' || field === 'password') {
            setError(field, { type: 'server', message });
          }
        }

        setFeedback({
          type: 'error',
          message: 'Please fix the highlighted fields.',
        });
        return;
      }

      let message = 'Unable to create your account. Please try again.';

      if (error instanceof ApiError) {
        if (error.status === 409) {
          message = 'An account with this email already exists.';
        } else if (error.status === 429) {
          message = 'Too many attempts. Please try again later.';
        } else if (error.code === 'NETWORK_ERROR') {
          message = error.message;
        } else if (error.status === 400 || error.status === 422) {
          message = 'Please check your information and try again.';
        }
      }

      setFeedback({ type: 'error', message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <h2>Create an Account</h2>
      <div>
        <label htmlFor="signup-name">Full Name</label>
        <input
          id="signup-name"
          type="text"
          autoComplete="name"
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={errors.name ? 'signup-name-error' : undefined}
          {...register('name', {
            setValueAs: (value: string) => value.trim(),
            required: 'Full name is required',
            maxLength: {
              value: 60,
              message: 'Name must be 60 characters or fewer',
            },
          })}
        />
        {errors.name && (
          <p id="signup-name-error" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="signup-email">Email Address</label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? 'signup-email-error' : undefined}
          {...register('email', {
            setValueAs: (value: string) => value.trim(),
            required: 'Email is required',
            maxLength: {
              value: 254,
              message: 'Email must be 254 characters or fewer',
            },
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Enter a valid email address',
            },
          })}
        />
        {errors.email && (
          <p id="signup-email-error" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? 'true' : 'false'}
          aria-describedby={
            errors.password ? 'signup-password-error' : undefined
          }
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 8,
              message: 'Password must be at least 8 characters',
            },
            maxLength: {
              value: 128,
              message: 'Password must be 128 characters or fewer',
            },
          })}
        />
        {errors.password && (
          <p id="signup-password-error" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="signup-confirm-password">Confirm Password</label>
        <input
          id="signup-confirm-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.confirmPassword ? 'true' : 'false'}
          aria-describedby={
            errors.confirmPassword ? 'signup-confirm-password-error' : undefined
          }
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (value) =>
              value === getValues('password') || 'Passwords do not match',
          })}
        />
        {errors.confirmPassword && (
          <p id="signup-confirm-password-error" role="alert">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>
      {feedback && (
        <p role={feedback.type === 'error' ? 'alert' : 'status'}>
          {feedback.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || feedback?.type === 'success'}
      >
        {isSubmitting ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  );
}
