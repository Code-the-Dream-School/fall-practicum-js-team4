import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { signedIn, testUser } from '../../test/server';

describe('Navbar', () => {
  it('shows nothing in the auth area while the session is loading', () => {
    renderApp('/');
    expect(
      screen.queryByRole('link', { name: /sign in/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /log out/i }),
    ).not.toBeInTheDocument();
  });

  it('shows Sign In to a signed-out visitor', async () => {
    renderApp('/');
    expect(
      await screen.findByRole('link', { name: /sign in/i }),
    ).toHaveAttribute('href', '/login');
    expect(
      screen.queryByRole('button', { name: /log out/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the profile link and Log out placeholder to a signed-in user', async () => {
    signedIn();
    renderApp('/');
    expect(
      await screen.findByRole('link', { name: new RegExp(testUser.name, 'i') }),
    ).toHaveAttribute('href', '/profile');
    expect(screen.getByRole('button', { name: /log out/i })).toBeDisabled();
  });

  it('shows the main links and report buttons on desktop', async () => {
    renderApp('/');
    const nav = await screen.findByRole('navigation', {
      name: /main navigation/i,
    });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /report lost/i })).toHaveAttribute(
      'href',
      '/report-pet?type=lost',
    );
  });
});
