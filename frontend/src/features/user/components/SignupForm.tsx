import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';

import { useForm, useWatch } from 'react-hook-form';
import type { RegisterInput } from '../../../services/authApi';

import { Icon } from '../../../components/Icon';
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
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>();

  const password = useWatch({
    control,
    name: 'password',
    defaultValue: '',
  });

  let passwordStrength = '';

  if (password) {
    if (password.length < 8) {
      passwordStrength = 'Weak';
    } else if (
      password.length >= 12 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^a-zA-Z0-9]/.test(password)
    ) {
      passwordStrength = 'Strong';
    } else {
      passwordStrength = 'Medium';
    }
  }

  const { status, setSession } = useAuth();

  const [feedback, setFeedback] = useState<Feedback>(null);

  const navigate = useNavigate();
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!registrationComplete) return;

    const timer = setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 1000);

    return () => clearTimeout(timer);
  }, [registrationComplete, navigate]);

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

      setRegistrationComplete(true);
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

  // Check authentication status before rendering the registration form
  if (status === 'loading') {
    return <p role="status">Verifying your sign-in status...</p>;
  }

  if (status === 'authenticated' && !registrationComplete) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, () => setFeedback(null))} noValidate>
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
        <div className="register-page__input">
          <Icon name="lock" className="register-page__input-icon" />
          <input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
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
          <button
            type="button"
            className="register-page__toggle"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            <Icon name={showPassword ? 'visibility_off' : 'visibility'} />
          </button>
        </div>
        {password && (
          <div className="register-page__strength">
            <div className="register-page__strength-track" aria-hidden="true">
              <div
                className={`register-page__strength-fill register-page__strength-fill--${passwordStrength.toLowerCase()}`}
              />
            </div>
            <p aria-live="polite">Password strength: {passwordStrength}</p>
          </div>
        )}
        {errors.password && (
          <p id="signup-password-error" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="signup-confirm-password">Confirm Password</label>
        <div className="register-page__input">
          <Icon name="lock" className="register-page__input-icon" />
          <input
            id="signup-confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            aria-invalid={errors.confirmPassword ? 'true' : 'false'}
            aria-describedby={
              errors.confirmPassword
                ? 'signup-confirm-password-error'
                : undefined
            }
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) =>
                value === getValues('password') || 'Passwords do not match',
            })}
          />
          <button
            type="button"
            className="register-page__toggle"
            onClick={() => setShowConfirmPassword((shown) => !shown)}
            aria-label={
              showConfirmPassword
                ? 'Hide confirm password'
                : 'Show confirm password'
            }
            aria-pressed={showConfirmPassword}
          >
            <Icon
              name={showConfirmPassword ? 'visibility_off' : 'visibility'}
            />
          </button>
        </div>
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

      <button type="submit" disabled={isSubmitting || registrationComplete}>
        {isSubmitting ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  );
}
