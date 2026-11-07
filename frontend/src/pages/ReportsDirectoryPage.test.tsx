import { screen } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderApp';
import {
  API,
  errorResponse,
  reportListResponse,
  server,
  testReports,
} from '../test/server';

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

  it('links each card to the report details page by the pet name only', async () => {
    renderApp('/lost-pets');

    // Exact name: screen readers announce the pet's name, not the whole card
    const link = await screen.findByRole('link', { name: 'Biscuit' });
    expect(link).toHaveAttribute('href', '/pets/1');
    expect(screen.getByText('Lost')).toBeInTheDocument();
    expect(screen.getByText(/Oct 30, 2026/)).toBeInTheDocument();
    expect(screen.getByText('ID: #1')).toBeInTheDocument();
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

  it('paginates through multiple pages of reports', async () => {
    const lostReports = [
      { ...testReports[0], petReportId: 1, petName: 'Biscuit' },
      { ...testReports[0], petReportId: 2, petName: 'Milo' },
      { ...testReports[0], petReportId: 3, petName: 'Daisy' },
    ];
    server.use(
      http.get(`${API}/api/reports`, ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page') ?? 1);
        return reportListResponse(lostReports, 1, page);
      }),
    );

    const { user } = renderApp('/lost-pets');

    expect(
      await screen.findByRole('heading', { name: 'Biscuit' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Previous page' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    expect(
      await screen.findByRole('heading', { name: 'Milo' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Biscuit' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(screen.getByRole('button', { name: 'Page 3' }));

    expect(
      await screen.findByRole('heading', { name: 'Daisy' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Previous page' }));

    expect(
      await screen.findByRole('heading', { name: 'Milo' }),
    ).toBeInTheDocument();
  });
});
