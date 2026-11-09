import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../test/renderApp';
import {
  API,
  errorResponse,
  queryReports,
  reportListResponse,
  server,
  testReports,
} from '../test/server';
import type { PublicReport } from '../types/reports';

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
});

describe('Searching and filtering a directory', () => {
  const biscuit = testReports[0];
  const lostPets: PublicReport[] = [
    biscuit,
    {
      ...biscuit,
      petReportId: 10,
      petName: 'Shadow',
      breed: 'German Shepherd',
      color: 'Black',
      size: 'LARGE',
      distinctiveFeatures: null,
      createdAt: '2026-10-20T08:00:00.000Z',
      location: { city: 'Durham', state: 'NC', zipCode: '27701' },
    },
    {
      ...biscuit,
      petReportId: 11,
      petType: 'CAT',
      petName: 'Oliver',
      breed: 'Domestic Shorthair',
      color: 'Orange',
      size: 'SMALL',
      gender: 'FEMALE',
      distinctiveFeatures: null,
      createdAt: '2026-10-25T08:00:00.000Z',
    },
  ];
  // Every request the page made, to check what it asked the API for
  let requests: URLSearchParams[];

  beforeEach(() => {
    requests = [];
    server.use(
      http.get(`${API}/api/reports`, ({ request }) => {
        requests.push(new URL(request.url).searchParams);
        return reportListResponse(queryReports(lostPets, request));
      }),
    );
  });

  const petNames = () =>
    screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);

  const searchBox = () =>
    screen.getByRole('searchbox', { name: 'Search lost pets' });

  it('searches as you type, once you pause', async () => {
    const { user } = renderApp('/lost-pets');
    await screen.findByRole('heading', { name: 'Shadow' });

    await user.type(searchBox(), 'shepherd');

    expect(
      await screen.findByText('1 lost pet matches your filters'),
    ).toBeInTheDocument();
    expect(petNames()).toEqual(['Shadow']);
    // One request for the whole word, not one per letter
    expect(requests.map((params) => params.get('search'))).toEqual([
      null,
      'shepherd',
    ]);
    expect(
      screen.getByRole('button', { name: 'Remove filter: “shepherd”' }),
    ).toBeInTheDocument();
  });

  it('keeps what you typed, spaces and focus included, after it searches', async () => {
    const { user } = renderApp('/lost-pets?sort=oldest');
    await screen.findByRole('heading', { name: 'Shadow' });

    await user.type(searchBox(), 'german ');
    // The search runs (trimmed) while you pause after the space…
    await screen.findByText('1 lost pet matches your filters');
    expect(requests.at(-1)?.get('search')).toBe('german');
    // …but the box still has the space, and you can keep typing
    expect(searchBox()).toHaveValue('german ');
    expect(searchBox()).toHaveFocus();

    await user.type(searchBox(), 'shepherd');
    await vi.waitFor(() =>
      expect(requests.at(-1)?.get('search')).toBe('german shepherd'),
    );
    expect(searchBox()).toHaveValue('german shepherd');
  });

  // Review comment: on ?page=2 the search used to lose focus once it ran
  it('keeps focus in the search box when opened from a ?page=2 link', async () => {
    const { user } = renderApp('/lost-pets?page=2');
    await screen.findByRole('heading', { name: 'Shadow' });

    await user.type(searchBox(), 'shep');
    await screen.findByText('1 lost pet matches your filters');
    expect(searchBox()).toHaveFocus();

    await user.type(searchBox(), 'herd');
    expect(searchBox()).toHaveValue('shepherd');
  });

  it('finds pets by city too', async () => {
    const { user } = renderApp('/lost-pets');
    await screen.findByRole('heading', { name: 'Shadow' });

    await user.type(searchBox(), 'durham{Enter}');

    await screen.findByText('1 lost pet matches your filters');
    expect(petNames()).toEqual(['Shadow']);
  });

  it.each(['dog', 'DOGS', 'Dog'])(
    'finds every dog when searching %s',
    async (search) => {
      const { user } = renderApp('/lost-pets');
      await screen.findByRole('heading', { name: 'Shadow' });

      await user.type(searchBox(), `${search}{Enter}`);

      await screen.findByText('2 lost pets match your filters');
      expect(petNames()).toEqual(['Biscuit', 'Shadow']);
    },
  );

  it('combines the menus, and sorts oldest first', async () => {
    const { user } = renderApp('/lost-pets');
    await screen.findByRole('heading', { name: 'Shadow' });
    expect(petNames()).toEqual(['Biscuit', 'Oliver', 'Shadow']);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Pet type' }),
      'Dogs',
    );
    await screen.findByText('2 lost pets match your filters');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Sort by' }),
      'Oldest first',
    );

    await vi.waitFor(() => expect(petNames()).toEqual(['Shadow', 'Biscuit']));
    expect(Object.fromEntries(requests.at(-1)!)).toEqual({
      type: 'LOST',
      petType: 'DOG',
      sort: 'oldest',
    });
  });

  it('removes one filter from its chip, and all of them with "Clear all"', async () => {
    const { user } = renderApp('/lost-pets?search=shepherd&size=LARGE');
    await screen.findByText('1 lost pet matches your filters');

    await user.click(
      screen.getByRole('button', { name: 'Remove filter: “shepherd”' }),
    );
    expect(searchBox()).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Size' })).toHaveDisplayValue(
      'Large',
    );

    await user.click(screen.getByRole('button', { name: 'Clear all filters' }));

    await screen.findByText('3 lost pets');
    expect(screen.getByRole('combobox', { name: 'Size' })).toHaveDisplayValue(
      'All sizes',
    );
    expect(screen.queryByText('Active filters:')).not.toBeInTheDocument();
  });

  it('explains when nothing matches, and offers to clear the filters', async () => {
    const { user } = renderApp('/lost-pets?search=parrot');

    expect(
      await screen.findByRole('heading', {
        name: 'No lost pets match your search',
      }),
    ).toBeInTheDocument();
    // Not the "nothing reported yet" message: there are reports
    expect(
      screen.queryByText('No lost pets reported right now'),
    ).not.toBeInTheDocument();
    expect(searchBox()).toHaveValue('parrot');

    const empty = screen
      .getByRole('heading', { name: 'No lost pets match your search' })
      .closest('div') as HTMLElement;
    await user.click(
      within(empty).getByRole('button', { name: 'Clear all filters' }),
    );

    expect(await screen.findByText('3 lost pets')).toBeInTheDocument();
  });

  it('ignores filter values it does not know in a shared link', async () => {
    renderApp('/lost-pets?size=HUGE&petType=dragon');

    expect(await screen.findByText('3 lost pets')).toBeInTheDocument();
    expect(Object.fromEntries(requests[0])).toEqual({ type: 'LOST' });
    expect(screen.queryByText('Active filters:')).not.toBeInTheDocument();
  });

  it('says when only the first page is shown', async () => {
    server.use(
      http.get(`${API}/api/reports`, () =>
        HttpResponse.json({
          success: true,
          data: {
            total: 45,
            page: 1,
            limit: 20,
            totalPages: 3,
            reports: lostPets,
          },
        }),
      ),
    );
    renderApp('/lost-pets');

    expect(
      await screen.findByText('Showing 3 of 45 lost pets'),
    ).toBeInTheDocument();
  });
});
