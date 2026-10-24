import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../test/renderApp';
import { http, HttpResponse, delay } from 'msw';
import { API, server, signedIn } from '../test/server';

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
});
