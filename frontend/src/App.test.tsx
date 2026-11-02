import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';
import { signedIn } from './test/server';

// App uses the real BrowserRouter, so tests drive it through the jsdom URL
const openAt = (path: string) => window.history.pushState({}, '', path);

describe('App', () => {
  afterEach(() => openAt('/'));

  it('sends a signed-out visitor to the login page', async () => {
    openAt('/dashboard');
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /welcome back to pawradar/i }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });

  it('opens the dashboard for a signed-in user', async () => {
    signedIn();
    openAt('/dashboard');
    render(<App />);

    expect(await screen.findByText('Logged in')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/dashboard');
  });
});
