import { screen } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderApp';
import { API, server, signedIn, testPassword, testUser } from '../test/server';

describe('ProtectedRoute', () => {
  it('shows a loading message while checking the session', async () => {
    server.use(
      http.get(`${API}/api/auth/me`, async () => {
        await delay(50);
        return HttpResponse.json({ success: true, data: { user: testUser } });
      }),
    );
    renderApp('/profile');

    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking your session…',
    );
    expect(
      await screen.findByRole('heading', {
        name: `${testUser.name}'s profile`,
      }),
    ).toBeInTheDocument();
  });

  it('shows the page to a signed-in user', async () => {
    signedIn();
    renderApp('/profile');

    expect(
      await screen.findByRole('heading', {
        name: `${testUser.name}'s profile`,
      }),
    ).toBeInTheDocument();
  });

  it.each([
    ['the session check returns 401', '/profile'],
    ['opening report pet page', '/report-pet'],
  ])('sends a signed-out user to login when %s', async (_, path) => {
    renderApp(path);

    expect(await screen.findByLabelText(/email address/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', {
        name: `${testUser.name}'s profile`,
      }),
    ).not.toBeInTheDocument();
  });

  it('treats an unreachable server as signed out', async () => {
    server.use(http.get(`${API}/api/auth/me`, () => HttpResponse.error()));
    renderApp('/profile');

    expect(await screen.findByLabelText(/email address/i)).toBeInTheDocument();
  });

  it('returns to the protected page after signing in', async () => {
    const { user } = renderApp('/profile');

    await user.type(
      await screen.findByLabelText(/email address/i),
      testUser.email,
    );
    await user.type(screen.getByLabelText(/^password/i), testPassword);
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(
      await screen.findByRole(
        'heading',
        { name: `${testUser.name}'s profile` },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
  });
});
