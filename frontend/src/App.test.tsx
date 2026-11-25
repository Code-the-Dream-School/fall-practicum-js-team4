import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';
import { signedIn, testUser } from './test/server';

// App uses the real BrowserRouter, so tests drive it through the jsdom URL
const openAt = (path: string) => window.history.pushState({}, '', path);

describe('App', () => {
  afterEach(() => openAt('/'));

  it('sends a signed-out visitor from /profile to the login page', async () => {
    openAt('/profile');
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /welcome back to pawradar/i }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });

  it('opens the profile for a signed-in user', async () => {
    signedIn();
    openAt('/profile');
    render(<App />);

    expect(
      await screen.findByRole('heading', {
        name: `${testUser.name}'s profile`,
      }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/profile');
  });

  it('renders 404 for removed /dashboard route', async () => {
    openAt('/dashboard');
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: '404' }),
    ).toBeInTheDocument();
  });
});
