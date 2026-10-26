import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from './test/renderApp';

describe('AppRoutes', () => {
  it('shows the home page at /', async () => {
    renderApp('/');
    expect(
      await screen.findByRole('heading', { name: /home/i }),
    ).toBeInTheDocument();
  });

  it.each([
    ['/lost-pets', /lost pets directory/i],
    ['/found-pets', /found pets directory/i],
  ])('renders the directory at %s', async (path, title) => {
    renderApp(path);
    expect(
      await screen.findByRole('heading', { name: title }),
    ).toBeInTheDocument();
  });

  it('shows the 404 page for unknown URLs', async () => {
    renderApp('/no-such-page');
    expect(
      await screen.findByRole('heading', { name: '404' }),
    ).toBeInTheDocument();
  });

  it('sends a signed-out visitor from /profile to the login page', async () => {
    renderApp('/profile');
    expect(
      await screen.findByRole('heading', { name: /welcome back to pawradar/i }),
    ).toBeInTheDocument();
  });
});
