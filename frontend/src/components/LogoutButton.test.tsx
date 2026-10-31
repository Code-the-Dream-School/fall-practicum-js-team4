import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../test/renderApp';
import { http, HttpResponse, delay } from 'msw';
import { API, server, signedIn, testUser, testPassword } from '../test/server';
import { PATHS } from '../app/paths';

// jsdom has no matchMedia, so the app always renders its desktop layout;
// this pretends the screen is a phone, which shows the bottom navigation
const useMobileLayout = () =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: true,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

describe('LogoutButton', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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
      screen.getByRole('link', { name: `Profile (${testUser.name})` }),
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
      screen.getByRole('link', { name: `Profile (${testUser.name})` }),
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

  it('9. removes the Log out button and the profile link after logout', async () => {
    signedIn();

    const { user } = renderApp(PATHS.home);
    await user.click(await screen.findByRole('button', { name: /log out/i }));

    expect(
      await screen.findByRole('heading', { name: /welcome back to pawradar/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /log out/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: `Profile (${testUser.name})` }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });

  it('10. sends a signed-out user from /profile to the login page', async () => {
    useMobileLayout();
    signedIn();

    const { user } = renderApp(PATHS.home);
    await user.click(await screen.findByRole('button', { name: /log out/i }));
    expect(
      await screen.findByRole('heading', { name: /welcome back to pawradar/i }),
    ).toBeInTheDocument();

    // Leave the login page, then tap Profile in the bottom navigation
    const mobileNav = screen.getByRole('navigation', {
      name: /mobile navigation/i,
    });
    await user.click(within(mobileNav).getByRole('link', { name: /home/i }));
    expect(
      screen.queryByRole('heading', { name: /welcome back to pawradar/i }),
    ).not.toBeInTheDocument();

    await user.click(within(mobileNav).getByRole('link', { name: /profile/i }));

    expect(
      await screen.findByRole('heading', { name: /welcome back to pawradar/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /profile & my reports/i }),
    ).not.toBeInTheDocument();
  });
});
