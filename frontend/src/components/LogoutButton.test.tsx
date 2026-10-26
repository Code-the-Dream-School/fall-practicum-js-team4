import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../test/renderApp';
import { http, HttpResponse, delay } from 'msw';
import { API, server, signedIn, testUser, testPassword } from '../test/server';

describe('LogoutButton', () => {
  it('renders the Logout Button for an authenticated User', async () => {
    signedIn();
    renderApp('/');
    const logoutButton = await screen.findByRole('button', {
      name: /log out/i,
    });

    expect(logoutButton).toBeInTheDocument();
    expect(logoutButton).toBeEnabled();
  });

  it('signs out the User and redirects to the Login Page', async () => {
    signedIn();
    const { user } = renderApp('/');
    const logoutButton = await screen.findByRole('button', {
      name: /log out/i,
    });
    await user.click(logoutButton);

    expect(
      await screen.findByRole('link', { name: /sign in/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /welcome back to pawradar/i }),
    ).toBeInTheDocument();
  });

  it('disables the Logout Button while the request is pending', async () => {
    signedIn();

    server.use(
      http.post(`${API}/api/auth/logout`, async () => {
        await delay(500);

        return HttpResponse.json({
          success: true,
          data: null,
        });
      }),
    );
    const { user } = renderApp('/');
    const logoutButton = await screen.findByRole('button', {
      name: /log out/i,
    });
    await user.click(logoutButton);

    expect(screen.getByRole('button', { name: /logging out/i })).toBeDisabled();
    expect(
      await screen.findByRole('heading', { name: /welcome back to pawradar/i }),
    ).toBeInTheDocument();
  });

  it('calls the logout API endpoint when clicked', async () => {
    signedIn();

    const logoutRequest = vi.fn();

    server.use(
      http.post(`${API}/api/auth/logout`, () => {
        logoutRequest();

        return HttpResponse.json({
          success: true,

          data: null,
        });
      }),
    );

    const { user } = renderApp('/');
    const logoutButton = await screen.findByRole('button', {
      name: /log out/i,
    });

    await user.click(logoutButton);

    expect(
      await screen.findByRole('heading', {
        name: /welcome back to pawradar/i,
      }),
    ).toBeInTheDocument();

    expect(logoutRequest).toHaveBeenCalledTimes(1);
  });

  it('does not return to the Profile page after logout and signing in again', async () => {
    signedIn();

    const { user } = renderApp('/profile');

    expect(
      await screen.findByRole('heading', { name: /profile & my reports/i }),
    ).toBeInTheDocument();

    const logoutButton = await screen.findByRole('button', {
      name: /log out/i,
    });
    await user.click(logoutButton);

    const emailInput = await screen.findByLabelText(/email address/i);

    expect(
      screen.getByRole('heading', { name: /welcome back to pawradar/i }),
    ).toBeInTheDocument();

    await user.type(emailInput, testUser.email);
    await user.type(screen.getByLabelText(/^password/i), testPassword);
    await user.click(
      screen.getByRole('button', { name: /sign in to pawradar/i }),
    );

    expect(
      await screen.findByText('Logged in', undefined, { timeout: 3000 }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('heading', { name: /profile & my reports/i }),
    ).not.toBeInTheDocument();
  });

  it('shows an error and keeps the user signed in when logout returns 500', async () => {
    signedIn();

    server.use(
      http.post(`${API}/api/auth/logout`, () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    const { user } = renderApp('/profile');

    const logoutButton = await screen.findByRole('button', {
      name: /log out/i,
    });
    await user.click(logoutButton);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to log out. Please try again',
    );

    expect(
      screen.getByRole('button', { name: /log out/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: /profile & my reports/i }),
    ).toBeInTheDocument();
  });

  it('shows an error and keeps the user signed in when the network fails', async () => {
    signedIn();

    server.use(
      http.post(`${API}/api/auth/logout`, () => {
        return HttpResponse.error();
      }),
    );
    const { user } = renderApp('/profile');

    const logoutButton = await screen.findByRole('button', {
      name: /log out/i,
    });
    await user.click(logoutButton);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to log out. Please try again',
    );

    expect(
      screen.getByRole('button', { name: /log out/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: /profile & my reports/i }),
    ).toBeInTheDocument();
  });
});
