import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../test/renderApp';
import { http, HttpResponse, delay } from 'msw';
import { API, server, signedIn, testUser, testPassword } from '../test/server';
import { PATHS } from '../app/paths';

describe('LogoutButton', () => {
  it('1. renders the Logout Button for an authenticated User', async () => {
    signedIn();

    renderApp(PATHS.home);
    const logoutButton = await screen.findByRole('button', {
      name: /log out/i,
    });

    expect(logoutButton).toBeInTheDocument();
    expect(logoutButton).toBeEnabled();
  });

  it('2. signs out the User and redirects to the Login Page', async () => {
    signedIn();

    const { user } = renderApp(PATHS.home);
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

  it('3. disables the Logout Button while the request is pending', async () => {
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
    const { user } = renderApp(PATHS.home);
    const logoutButton = await screen.findByRole('button', {
      name: /log out/i,
    });
    await user.click(logoutButton);

    expect(screen.getByRole('button', { name: /logging out/i })).toBeDisabled();
    expect(
      await screen.findByRole('heading', { name: /welcome back to pawradar/i }),
    ).toBeInTheDocument();
  });

  it('4. calls the logout API endpoint when clicked', async () => {
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

    const { user } = renderApp(PATHS.home);
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

  it('5. does not return to the Profile page after logout and signing in again', async () => {
    signedIn();

    const { user } = renderApp(PATHS.profile);

    expect(
      await screen.findByRole('heading', { name: /profile & my reports/i }),
    ).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /log out/i }));

    expect(
      await screen.findByRole('heading', { name: /welcome back to pawradar/i }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email address/i), testUser.email);
    await user.type(screen.getByLabelText(/^password/i), testPassword);
    await user.click(
      screen.getByRole('button', { name: /sign in to pawradar/i }),
    );

    expect(
      await screen.findByText(/^Logged in$/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('heading', { name: /profile & my reports/i }),
    ).not.toBeInTheDocument();
  });

  it('6. shows an error and keeps the user signed in when logout returns 500', async () => {
    signedIn();

    server.use(
      http.post(`${API}/api/auth/logout`, () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    const { user } = renderApp(PATHS.profile);

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

  it('7. shows an error and keeps the user signed in when the network fails', async () => {
    signedIn();

    server.use(
      http.post(`${API}/api/auth/logout`, () => {
        return HttpResponse.error();
      }),
    );
    const { user } = renderApp(PATHS.profile);

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

  it('8. redirects to the requested protected page after logout and signing in again', async () => {
    signedIn();

    const { user } = renderApp(PATHS.profile);

    await user.click(await screen.findByRole('button', { name: /log out/i }));

    expect(
      await screen.findByRole('heading', { name: /welcome back to pawradar/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /report lost/i }));

    expect(
      await screen.findByRole('heading', {
        name: /welcome back to pawradar/i,
      }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email address/i), testUser.email);
    await user.type(screen.getByLabelText(/^password/i), testPassword);
    await user.click(
      screen.getByRole('button', { name: /sign in to pawradar/i }),
    );

    expect(
      await screen.findByRole(
        'heading',
        { name: /report a pet: lost/i },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
  });
});
