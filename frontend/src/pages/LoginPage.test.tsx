import { screen } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderApp';
import {
  API,
  errorResponse,
  server,
  signedIn,
  testPassword,
  testUser,
} from '../test/server';

// The success message stays up for a second before redirecting
const REDIRECT = { timeout: 3000 };

const fillForm = async (
  user: ReturnType<typeof renderApp>['user'],
  email = testUser.email,
  password = testPassword,
) => {
  await user.type(await screen.findByLabelText(/email address/i), email);
  await user.type(screen.getByLabelText(/^password/i), password);
};

const submit = (user: ReturnType<typeof renderApp>['user']) =>
  user.click(screen.getByRole('button', { name: /sign in/i }));

// Records each login request body
const spyOnLogin = () => {
  const bodies: unknown[] = [];
  server.events.on('request:start', async ({ request }) => {
    if (request.url.endsWith('/api/auth/login')) {
      bodies.push(await request.clone().json());
    }
  });
  return bodies;
};

describe('LoginPage', () => {
  describe('validation', () => {
    it('requires email and password without calling the API', async () => {
      const bodies = spyOnLogin();
      const { user } = renderApp('/login');

      await screen.findByLabelText(/email address/i);
      await submit(user);

      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toHaveAttribute(
        'aria-invalid',
        'true',
      );
      expect(bodies).toHaveLength(0);
    });

    it('rejects a malformed email', async () => {
      const { user } = renderApp('/login');

      await fillForm(user, 'not-an-email');
      await submit(user);

      expect(
        screen.getByText('Enter a valid email address'),
      ).toBeInTheDocument();
    });

    it('rejects a password over 128 characters', async () => {
      const { user } = renderApp('/login');

      await user.type(
        await screen.findByLabelText(/email address/i),
        testUser.email,
      );
      // paste instead of type: typing 129 characters one by one is slow
      await user.click(screen.getByLabelText(/^password/i));
      await user.paste('x'.repeat(129));
      await submit(user);

      expect(
        screen.getByText('Password must be at most 128 characters'),
      ).toBeInTheDocument();
    });

    it('trims spaces around the email before sending', async () => {
      const bodies = spyOnLogin();
      const { user } = renderApp('/login');

      await fillForm(user, `  ${testUser.email}  `);
      await submit(user);

      expect(await screen.findByText(/welcome back, sam/i)).toBeInTheDocument();
      expect(bodies[0]).toMatchObject({ email: testUser.email });
    });
  });

  describe('server responses', () => {
    it('shows invalid credentials', async () => {
      const { user } = renderApp('/login');

      await fillForm(user, testUser.email, 'wrong-password');
      await submit(user);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Email or password is incorrect.',
      );
    });

    it.each([
      [
        'an unreachable server',
        () => HttpResponse.error(),
        /could not reach the server/i,
      ],
      [
        'a server error',
        () => errorResponse(500, 'INTERNAL_ERROR'),
        /something went wrong on our side/i,
      ],
      [
        'a non-JSON gateway error',
        () => new HttpResponse('Bad Gateway', { status: 502 }),
        /something went wrong on our side/i,
      ],
      [
        'too many attempts',
        () => errorResponse(429, 'TOO_MANY_REQUESTS'),
        /too many sign-in attempts/i,
      ],
    ])('shows a message for %s', async (_, respond, message) => {
      server.use(http.post(`${API}/api/auth/login`, respond));
      const { user } = renderApp('/login');

      await fillForm(user);
      await submit(user);

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      // Still on the login page
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    it('shows a generic message for an unexpected response', async () => {
      // 200 without data.user: a bug or a mismatched backend version
      server.use(
        http.post(`${API}/api/auth/login`, () =>
          HttpResponse.json({ success: true, data: {} }),
        ),
      );
      const { user } = renderApp('/login');

      await fillForm(user);
      await submit(user);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        /something went wrong on our side/i,
      );
      // Not signed in as "nobody"
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });

    it('shows server validation errors next to the field', async () => {
      server.use(
        http.post(`${API}/api/auth/login`, () =>
          HttpResponse.json(
            {
              success: false,
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: [
                { field: 'email', message: '"email" must be a valid email' },
              ],
            },
            { status: 400 },
          ),
        ),
      );
      const { user } = renderApp('/login');

      await fillForm(user);
      await submit(user);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Please fix the highlighted fields.',
      );
      expect(
        screen.getByText('"email" must be a valid email'),
      ).toBeInTheDocument();
    });

    it('shows only the banner for errors on fields the form does not show', async () => {
      server.use(
        http.post(`${API}/api/auth/login`, () =>
          HttpResponse.json(
            {
              success: false,
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: [
                {
                  field: 'rememberMe',
                  message: '"rememberMe" must be a boolean',
                },
              ],
            },
            { status: 400 },
          ),
        ),
      );
      const { user } = renderApp('/login');

      await fillForm(user);
      await submit(user);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Please fix the highlighted fields.',
      );
      expect(screen.queryByText(/must be a boolean/)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toHaveAttribute(
        'aria-invalid',
        'false',
      );
    });

    it('disables the button while signing in', async () => {
      server.use(
        http.post(`${API}/api/auth/login`, async () => {
          await delay(100);
          return errorResponse(401, 'INVALID_CREDENTIALS');
        }),
      );
      const { user } = renderApp('/login');

      await fillForm(user);
      await submit(user);

      expect(
        screen.getByRole('button', { name: /signing in/i }),
      ).toBeDisabled();
      await screen.findByRole('alert');
      expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
    });
  });

  describe('success', () => {
    it('shows a welcome message, then opens the protected page', async () => {
      const { user } = renderApp('/login');

      await fillForm(user);
      await submit(user);

      expect(await screen.findByRole('status')).toHaveTextContent(
        'Welcome back, Sam Rivera! Redirecting…',
      );
      expect(
        await screen.findByText('Logged in', undefined, REDIRECT),
      ).toBeInTheDocument();
    });

    it('sends rememberMe: true by default', async () => {
      const bodies = spyOnLogin();
      const { user } = renderApp('/login');

      await fillForm(user);
      expect(
        screen.getByRole('checkbox', { name: /remember this terminal/i }),
      ).toBeChecked();
      await submit(user);

      await screen.findByText(/welcome back, sam/i);
      expect(bodies[0]).toEqual({
        email: testUser.email,
        password: testPassword,
        rememberMe: true,
      });
    });

    it('sends rememberMe: false when unchecked', async () => {
      const bodies = spyOnLogin();
      const { user } = renderApp('/login');

      await fillForm(user);
      await user.click(
        screen.getByRole('checkbox', { name: /remember this terminal/i }),
      );
      await submit(user);

      await screen.findByText(/welcome back, sam/i);
      expect(bodies[0]).toMatchObject({ rememberMe: false });
    });
  });

  it('shows and hides the password', async () => {
    const { user } = renderApp('/login');
    const password = await screen.findByLabelText(/^password/i);

    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('sends an already signed-in user to the dashboard', async () => {
    signedIn();
    renderApp('/login');

    expect(await screen.findByText('Logged in')).toBeInTheDocument();
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
  });
});
