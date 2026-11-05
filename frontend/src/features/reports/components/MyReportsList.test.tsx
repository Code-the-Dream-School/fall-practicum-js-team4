import { screen, within } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { API, errorResponse, server, signedIn } from '../../../test/server';
import { renderApp } from '../../../test/renderApp';
import {
  foundDog,
  luna,
  milo,
  mockMyReports,
  report,
} from '../../../test/reports';

const card = async (name: string) =>
  (await screen.findByRole('heading', { name })).closest('li') as HTMLElement;

describe('My reports on the profile page', () => {
  it('offers "Mark Reunited" only on active lost reports', async () => {
    signedIn();
    mockMyReports([milo, luna, foundDog]);
    renderApp('/profile');

    expect(
      within(await card('Milo')).getByRole('button', {
        name: /mark reunited/i,
      }),
    ).toBeInTheDocument();

    const lunaCard = await card('Luna');
    expect(within(lunaCard).getByText('Reunited safe')).toBeInTheDocument();
    expect(
      within(lunaCard).getByText('Reunited with family'),
    ).toBeInTheDocument();
    expect(within(lunaCard).queryByRole('button')).not.toBeInTheDocument();

    expect(
      within(await card('Found dog')).queryByRole('button'),
    ).not.toBeInTheDocument();
  });

  it('marks the pet as reunited after the owner confirms', async () => {
    signedIn();
    const patches = mockMyReports([milo]);
    const { user } = renderApp('/profile');
    const miloCard = await card('Milo');

    await user.click(
      within(miloCard).getByRole('button', { name: /mark reunited/i }),
    );
    expect(
      within(miloCard).getByText(/is milo back home\?/i),
    ).toBeInTheDocument();
    expect(
      within(miloCard).getByRole('button', { name: "Yes, we're reunited" }),
    ).toHaveFocus();
    expect(patches).toHaveLength(0);

    await user.click(
      within(miloCard).getByRole('button', { name: "Yes, we're reunited" }),
    );

    // The reunited badge replaces "Lost pet"
    expect(
      await within(miloCard).findByText('Reunited safe'),
    ).toBeInTheDocument();
    expect(within(miloCard).queryByText('Lost pet')).not.toBeInTheDocument();
    // The buttons are gone: focus continues from the card's heading
    expect(
      within(miloCard).getByRole('heading', { name: 'Milo' }),
    ).toHaveFocus();
    // Only the badge changes: the date stays (the design mockup overwrote it)
    expect(within(miloCard).getByText('Oct 28, 2026')).toBeInTheDocument();
    // No second click possible
    expect(within(miloCard).queryByRole('button')).not.toBeInTheDocument();
    expect(patches).toEqual([{ id: '1', body: { status: 'REUNITED' } }]);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Case updated to Reunited!',
    );
  });

  it('changes nothing when the owner cancels', async () => {
    signedIn();
    const patches = mockMyReports([milo]);
    const { user } = renderApp('/profile');
    const miloCard = await card('Milo');

    await user.click(
      within(miloCard).getByRole('button', { name: /mark reunited/i }),
    );
    await user.click(within(miloCard).getByRole('button', { name: 'Cancel' }));

    expect(
      within(miloCard).getByRole('button', { name: /mark reunited/i }),
    ).toHaveFocus();
    expect(within(miloCard).getByText('Lost pet')).toBeInTheDocument();
    expect(patches).toHaveLength(0);
  });

  it('explains a failed save, keeps the report active and does not retry', async () => {
    signedIn();
    mockMyReports([milo]);
    let attempts = 0;
    server.use(
      http.patch(`${API}/api/reports/:id`, () => {
        attempts++;
        return errorResponse(500, 'INTERNAL_ERROR');
      }),
    );
    const { user } = renderApp('/profile');
    const miloCard = await card('Milo');

    await user.click(
      within(miloCard).getByRole('button', { name: /mark reunited/i }),
    );
    await user.click(
      within(miloCard).getByRole('button', { name: "Yes, we're reunited" }),
    );

    expect(await within(miloCard).findByRole('alert')).toHaveTextContent(
      "Something went wrong on our side. The report wasn't changed.",
    );
    expect(within(miloCard).getByText('Lost pet')).toBeInTheDocument();
    expect(attempts).toBe(1);
    expect(
      within(miloCard).getByRole('button', { name: "Yes, we're reunited" }),
    ).toHaveFocus();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('shows the total and a link to file a new report', async () => {
    signedIn();
    mockMyReports([milo, luna]);
    renderApp('/profile');

    expect(await screen.findByText('2 total reports')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /file new report/i }),
    ).toHaveAttribute('href', '/report-pet');
  });

  it('says so when the user has no reports', async () => {
    signedIn();
    mockMyReports([]);
    renderApp('/profile');

    expect(
      await screen.findByText(/you haven't reported any pets yet/i),
    ).toBeInTheDocument();
  });

  it('links every card to its report page', async () => {
    signedIn();
    mockMyReports([milo, luna]);
    renderApp('/profile');

    expect(
      within(await card('Milo')).getByRole('link', {
        name: 'View report for Milo',
      }),
    ).toHaveAttribute('href', '/pets/1');
    expect(
      within(await card('Luna')).getByRole('link', {
        name: 'View report for Luna',
      }),
    ).toHaveAttribute('href', '/pets/2');
  });

  it('says whether the date is when the pet was lost or found', async () => {
    signedIn();
    mockMyReports([milo, foundDog]);
    renderApp('/profile');

    expect(within(await card('Milo')).getByText(/lost on/i)).toHaveTextContent(
      'Lost on Oct 28, 2026',
    );
    expect(
      within(await card('Found dog')).getByText(/found on/i),
    ).toHaveTextContent('Found on Oct 28, 2026');
  });

  it('shows the pet type, then the breed as a title', async () => {
    signedIn();
    mockMyReports([
      report({ petName: 'Chester', petType: 'CAT', breed: 'siamese' }),
      report({ petReportId: 2, petName: 'Rex', breed: null }),
    ]);
    renderApp('/profile');

    expect(
      within(await card('Chester')).getByText('• Cat • Siamese • Male'),
    ).toBeInTheDocument();
    expect(
      within(await card('Rex')).getByText('• Dog • Male'),
    ).toBeInTheDocument();
  });
});
