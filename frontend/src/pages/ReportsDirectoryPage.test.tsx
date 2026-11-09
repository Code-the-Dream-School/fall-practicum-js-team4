import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, useNavigate } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../AppRoutes';
import { QueryProvider } from '../app/QueryProvider';
import { AuthProvider } from '../context/AuthProvider';
import { renderApp } from '../test/renderApp';
import {
  API,
  errorResponse,
  pagedReportList,
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
      limit: '6',
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
    expect(Object.fromEntries(requests[0])).toEqual({
      type: 'LOST',
      limit: '6',
    });
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
      await screen.findByText('Showing 1–3 of 45 lost pets'),
    ).toBeInTheDocument();
  });
});

// Stands in for the browser's Back button (a MemoryRouter has no browser UI)
function BrowserBack() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => void navigate(-1)}>
      Browser back
    </button>
  );
}

const renderWithBack = (path: string) => {
  const user = userEvent.setup();
  render(
    <AuthProvider>
      <QueryProvider retryDelay={0}>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
          <BrowserBack />
        </MemoryRouter>
      </QueryProvider>
    </AuthProvider>,
  );
  return { user };
};

describe('Moving between pages', () => {
  // 45 lost pets, newest first: Pet 1 … Pet 45
  const manyPets: PublicReport[] = Array.from({ length: 45 }, (_, i) => ({
    ...testReports[0],
    petReportId: 100 + i,
    petName: `Pet ${i + 1}`,
    createdAt: new Date(Date.UTC(2026, 9, 30) - i * 60_000).toISOString(),
  }));
  let requests: URLSearchParams[];

  beforeEach(() => {
    requests = [];
    server.use(
      http.get(`${API}/api/reports`, ({ request }) => {
        requests.push(new URL(request.url).searchParams);
        return pagedReportList(queryReports(manyPets, request), request);
      }),
    );
  });

  const pages = () => screen.getByRole('navigation', { name: 'Pagination' });
  const pageButton = (name: string) =>
    within(pages()).getByRole('button', { name });

  it('shows 6 pets per page, as in the design, and which ones in the count', async () => {
    renderApp('/lost-pets');

    expect(
      await screen.findByText('Showing 1–6 of 45 lost pets'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(6);
    expect(requests[0].get('limit')).toBe('6');
    // Page 1 is the API's default
    expect(requests[0].get('page')).toBeNull();
  });

  it('moves with Next, the page numbers and Previous, keeping focus at the top of the results', async () => {
    const { user } = renderApp('/lost-pets');
    await screen.findByText('Showing 1–6 of 45 lost pets');
    expect(pageButton('Page 1')).toHaveAttribute('aria-current', 'page');
    expect(pageButton('Previous page')).toBeDisabled();

    await user.click(pageButton('Next page'));

    const count = await screen.findByText('Showing 7–12 of 45 lost pets');
    expect(screen.getByRole('heading', { name: 'Pet 7' })).toBeInTheDocument();
    expect(requests.at(-1)?.get('page')).toBe('2');
    // Not lost on <body>: reading continues from the top of the new page
    expect(count).toHaveFocus();

    await user.click(pageButton('Page 8'));
    await screen.findByText('Showing 43–45 of 45 lost pets');
    expect(pageButton('Next page')).toBeDisabled();

    await user.click(pageButton('Previous page'));
    expect(
      await screen.findByText('Showing 37–42 of 45 lost pets'),
    ).toHaveFocus();
  });

  it('keeps the page after opening a pet and coming back', async () => {
    const { user } = renderWithBack('/lost-pets');
    await screen.findByText('Showing 1–6 of 45 lost pets');
    await user.click(pageButton('Page 3'));
    await screen.findByText('Showing 13–18 of 45 lost pets');

    await user.click(screen.getByRole('link', { name: 'Pet 13' }));
    await screen.findByRole('heading', { name: /Pet details/ });
    await user.click(screen.getByRole('button', { name: 'Browser back' }));

    expect(
      await screen.findByText('Showing 13–18 of 45 lost pets'),
    ).toBeInTheDocument();
    expect(pageButton('Page 3')).toHaveAttribute('aria-current', 'page');
  });

  it('opens the page given in a shared or reloaded link', async () => {
    renderApp('/lost-pets?page=2');

    expect(
      await screen.findByText('Showing 7–12 of 45 lost pets'),
    ).toBeInTheDocument();
    expect(requests[0].get('page')).toBe('2');
  });

  it('keeps the filters when changing page, and goes back to page 1 when a filter changes', async () => {
    const { user } = renderApp('/lost-pets?search=pet&page=2');
    await screen.findByText(
      'Showing 7–12 of 45 lost pets matching your filters',
    );

    await user.click(pageButton('Next page'));
    await screen.findByText(
      'Showing 13–18 of 45 lost pets matching your filters',
    );
    expect(Object.fromEntries(requests.at(-1)!)).toEqual({
      type: 'LOST',
      search: 'pet',
      page: '3',
      limit: '6',
    });

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Pet type' }),
      'Dogs',
    );
    await screen.findByText(
      'Showing 1–6 of 45 lost pets matching your filters',
    );
    expect(requests.at(-1)?.get('page')).toBeNull();
  });

  it('starts again from page 1 when switching between Lost and Found', async () => {
    const { user } = renderApp('/lost-pets?page=2');
    await screen.findByText('Showing 7–12 of 45 lost pets');

    await user.click(screen.getByRole('link', { name: 'Found Pets' }));

    expect(
      await screen.findByRole('heading', { name: 'Found Pets Directory' }),
    ).toBeInTheDocument();
    await vi.waitFor(() => expect(requests.at(-1)?.get('type')).toBe('FOUND'));
    expect(requests.at(-1)?.get('page')).toBeNull();
  });

  it('explains a page past the end, and offers the first page', async () => {
    const { user } = renderApp('/lost-pets?page=99');

    expect(
      await screen.findByRole('heading', { name: "There's no page 99" }),
    ).toBeInTheDocument();
    expect(screen.getByText('The list has 8 pages.')).toBeInTheDocument();
    // Not the "nothing reported" message: there are reports
    expect(
      screen.queryByText('No lost pets reported right now'),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Go to the first page' }),
    );

    expect(
      await screen.findByText('Showing 1–6 of 45 lost pets'),
    ).toBeInTheDocument();
    expect(requests.at(-1)?.get('page')).toBeNull();
  });

  it('reads a broken page number as page 1', async () => {
    renderApp('/lost-pets?page=abc');

    expect(
      await screen.findByText('Showing 1–6 of 45 lost pets'),
    ).toBeInTheDocument();
    expect(requests[0].get('page')).toBeNull();
  });

  it('still shows the count when everything fits on one page', async () => {
    renderApp('/lost-pets?search=pet 45');

    expect(
      await screen.findByText('1 lost pet matches your filters'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Pagination' }),
    ).not.toBeInTheDocument();
  });

  it('disables the page buttons while the next page loads', async () => {
    let release!: () => void;
    const nextPageHeld = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(`${API}/api/reports`, async ({ request }) => {
        if (new URL(request.url).searchParams.get('page') === '2') {
          await nextPageHeld;
        }
        return pagedReportList(queryReports(manyPets, request), request);
      }),
    );
    const { user } = renderApp('/lost-pets');
    await screen.findByText('Showing 1–6 of 45 lost pets');

    await user.click(pageButton('Next page'));

    await vi.waitFor(() => expect(pageButton('Next page')).toBeDisabled());
    expect(pageButton('Page 3')).toBeDisabled();

    release();

    await screen.findByText('Showing 7–12 of 45 lost pets');
    expect(pageButton('Next page')).toBeEnabled();
  });
});
