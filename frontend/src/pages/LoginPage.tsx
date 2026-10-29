import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { PATHS } from '../app/paths';
import type { Location } from 'react-router';
import { useAuth } from '../context/useAuth';
import { ApiError } from '../services/api';
import { login } from '../services/authApi';
import type { LoginInput, User } from '../services/authApi';
import { Icon } from '../components/Icon';
import { loginRules } from '../validation/authRules';
import { describeLoginError } from './loginErrors';
import './LoginPage.css';

const DEFAULT_REDIRECT = PATHS.dashboard;
// Long enough to read the success message
const REDIRECT_DELAY_MS = 1000;

type Feedback = { type: 'error' | 'success'; message: string } | null;

export function LoginPage() {
  const { status, setSession, signedOutByUser, clearSignedOutByUser } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [signedInUser, setSignedInUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (signedOutByUser) {
      clearSignedOutByUser();
    }
  }, [signedOutByUser, clearSignedOutByUser]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    mode: 'onTouched',
    defaultValues: { email: '', password: '', rememberMe: true },
  });

  // Send the user back to the protected page that redirected them here
  const fromLocation = (location.state as { from?: Location } | null)?.from;
  const from = fromLocation
    ? `${fromLocation.pathname}${fromLocation.search}`
    : DEFAULT_REDIRECT;

  useEffect(() => {
    if (!signedInUser) return;
    const id = setTimeout(
      () => navigate(from, { replace: true }),
      REDIRECT_DELAY_MS,
    );
    return () => clearTimeout(id);
  }, [signedInUser, from, navigate]);

  const onSubmit = async (values: LoginInput) => {
    setFeedback(null);
    try {
      const user = await login(values);
      setSession(user);
      setSignedInUser(user);
      setFeedback({
        type: 'success',
        message: `Welcome back, ${user.name}! Redirecting…`,
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
        for (const { field, message } of err.details) {
          if (field === 'email' || field === 'password') {
            setError(field, { type: 'server', message });
          }
        }
      }
      setFeedback({ type: 'error', message: describeLoginError(err) });
    }
  };

  if (status === 'loading') {
    return (
      <p className="page-status" role="status">
        Checking your session…
      </p>
    );
  }
  // Already signed in before opening this page
  if (status === 'authenticated' && !signedInUser) {
    return <Navigate to={from} replace />;
  }

  const busy = isSubmitting || signedInUser !== null;

  return (
    <div className="login">
      {/* Decorative background from the mockup */}
      <div className="login__glow login__glow--cyan" aria-hidden="true" />
      <div className="login__glow login__glow--orange" aria-hidden="true" />
      <svg className="login__rings" viewBox="0 0 800 800" aria-hidden="true">
        <circle cx="400" cy="400" r="380" strokeDasharray="4 8" />
        <circle cx="400" cy="400" r="280" strokeDasharray="2 6" />
        <circle cx="400" cy="400" r="180" strokeDasharray="6 6" />
        <line x1="400" y1="20" x2="400" y2="780" strokeDasharray="2 4" />
        <line x1="20" y1="400" x2="780" y2="400" strokeDasharray="2 4" />
      </svg>

      <div className="login__card">
        <header className="login__header">
          <span className="login__pill">
            <span className="login__dot" aria-hidden="true" />
            Incident Relay Dispatch
          </span>
          <div className="login__beacon" aria-hidden="true">
            <span className="login__beacon-ping" />
            <span className="login__beacon-icon">
              <Icon name="radar" />
            </span>
          </div>
          <h1>Welcome Back to PawRadar</h1>
          <p>
            Sign in to track emergency alerts, manage community sightings, and
            follow your reports in real time.
          </p>
        </header>

        {feedback && (
          <div
            className={`login__feedback login__feedback--${feedback.type}`}
            role={feedback.type === 'error' ? 'alert' : 'status'}
          >
            <Icon name={feedback.type === 'error' ? 'error' : 'check_circle'} />
            <span>{feedback.message}</span>
          </div>
        )}

        <form
          className="login__form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div className="login__field">
            <label htmlFor="login-email">
              Email address <span className="login__required">*</span>
            </label>
            <div className="login__input">
              <Icon name="mail" className="login__input-icon" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={
                  errors.email ? 'login-email-error' : undefined
                }
                {...register('email', loginRules.email)}
              />
            </div>
            {errors.email && (
              <p id="login-email-error" className="login__error">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="login__field">
            <label htmlFor="login-password">
              Password <span className="login__required">*</span>
            </label>
            <div className="login__input">
              <Icon name="lock" className="login__input-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••••••"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={
                  errors.password ? 'login-password-error' : undefined
                }
                {...register('password', loginRules.password)}
              />
              <button
                type="button"
                className="login__toggle"
                onClick={() => setShowPassword((shown) => !shown)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                <Icon name={showPassword ? 'visibility_off' : 'visibility'} />
              </button>
            </div>
            {errors.password && (
              <p id="login-password-error" className="login__error">
                {errors.password.message}
              </p>
            )}
          </div>

          <label className="login__remember">
            <input type="checkbox" {...register('rememberMe')} />
            <span className="login__checkbox" aria-hidden="true">
              <Icon name="check" />
            </span>
            <span>Remember this terminal</span>
          </label>

          <button type="submit" className="login__submit" disabled={busy}>
            <Icon name="radar" className="login__submit-icon" />
            <span>{isSubmitting ? 'Signing in…' : 'Sign In to PawRadar'}</span>
          </button>
        </form>

        <p className="login__signup">
          Don't have an account? <Link to={PATHS.register}>Sign Up</Link>
        </p>

        <p className="login__note">
          <Icon name="verified_user" className="login__note-icon" />
          Your session is kept in a secure, HTTP-only cookie
        </p>
      </div>
    </div>
  );
}
