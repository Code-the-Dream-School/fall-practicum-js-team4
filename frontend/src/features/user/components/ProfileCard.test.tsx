import { screen, within } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../../test/renderApp';
import { foundDog, luna, milo, mockMyReports } from '../../../test/reports';
import {
  API,
  errorResponse,
  server,
  signedIn,
  testUser,
} from '../../../test/server';

const profileCard = () =>
  screen.findByRole('complementary', { name: /your profile/i });

// The number shown above a stat's label
const stat = (card: HTMLElement, label: string) =>
  within(card).getByText(label).previousElementSibling;

describe('ProfileCard', () => {
  it("shows the user's name, email and join month", async () => {
    signedIn();
    mockMyReports([]);
    renderApp('/profile');
    const card = await profileCard();

    expect(
      within(card).getByRole('heading', { level: 2, name: testUser.name }),
    ).toBeInTheDocument();
    expect(within(card).getByText(testUser.email)).toBeInTheDocument();
    expect(within(card).getByText('Oct 2026')).toBeInTheDocument();
  });

  it('counts filed, active and reunited reports', async () => {
    signedIn();
    mockMyReports([milo, luna, foundDog]);
    renderApp('/profile');
    const card = await profileCard();

    expect(await within(card).findByText('3')).toBeInTheDocument();
    expect(stat(card, 'Reports Filed')).toHaveTextContent('3');
    expect(stat(card, 'Active')).toHaveTextContent('2');
    expect(stat(card, 'Reunited')).toHaveTextContent('1');
  });

  it('updates the counts right after a pet is marked reunited', async () => {
    signedIn();
    mockMyReports([milo, luna]);
    const { user } = renderApp('/profile');
    const card = await profileCard();
    await within(card).findByText('2');
    expect(stat(card, 'Active')).toHaveTextContent('1');

    await user.click(
      await screen.findByRole('button', { name: /mark reunited/i }),
    );
    await user.click(
      screen.getByRole('button', { name: "Yes, we're reunited" }),
    );

    expect(await screen.findByText(/case updated to reunited/i)).toBeVisible();
    expect(stat(card, 'Active')).toHaveTextContent('0');
    expect(stat(card, 'Reunited')).toHaveTextContent('2');
  });

  it('keeps the profile and shows dashes when the reports fail to load', async () => {
    signedIn();
    server.use(
      http.get(`${API}/api/reports/mine`, () =>
        errorResponse(500, 'INTERNAL_ERROR'),
      ),
    );
    renderApp('/profile');
    const card = await profileCard();

    // The list explains the failure; the card keeps what it knows
    await screen.findByText(/something went wrong on our side/i);
    expect(within(card).getByText(testUser.email)).toBeInTheDocument();
    expect(stat(card, 'Reports Filed')).toHaveTextContent('–');
    expect(stat(card, 'Active')).toHaveTextContent('–');
    expect(stat(card, 'Reunited')).toHaveTextContent('–');
  });
});
