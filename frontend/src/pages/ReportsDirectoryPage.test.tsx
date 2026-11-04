import { screen } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderApp';
import { API, errorResponse, reportListResponse, server } from '../test/server';

describe('ReportsDirectoryPage', () => {
  it('shows loading, then only lost reports on the lost page', async () => {
    renderApp('/lost-pets');

    expect(await screen.findByText('Loading lost pets...')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Biscuit' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Found cat' }),
    ).not.toBeInTheDocument();
  });

  it('shows only found reports on the found page, with fallbacks', async () => {
    renderApp('/found-pets');

    expect(
      await screen.findByRole('heading', { name: 'Found cat' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Biscuit' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('No photo')).toBeInTheDocument();
    expect(screen.getByText(/Location not given/)).toBeInTheDocument();
  });

  it('links each card to the report details page', async () => {
    renderApp('/lost-pets');

    const card = await screen.findByRole('link', { name: /Biscuit/ });
    expect(card).toHaveAttribute('href', '/pets/1');
    expect(screen.getByText(/Oct 30, 2026/)).toBeInTheDocument();
  });

  it('shows an empty state with a call to action', async () => {
    server.use(http.get(`${API}/api/reports`, () => reportListResponse([])));
    renderApp('/lost-pets');

    expect(
      await screen.findByRole('heading', {
        name: 'No lost pets reported right now',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'File Lost Pet Report' }),
    ).toHaveAttribute('href', '/report-pet?type=lost');
  });

  it('shows an error with Try again and loads the list after a retry', async () => {
    server.use(
      http.get(`${API}/api/reports`, () =>
        errorResponse(500, 'INTERNAL_ERROR'),
      ),
    );
    const { user } = renderApp('/lost-pets');

    const retry = await screen.findByRole('button', { name: /try again/i });
    server.resetHandlers();
    await user.click(retry);

    expect(
      await screen.findByRole('heading', { name: 'Biscuit' }),
    ).toBeInTheDocument();
  });
});
