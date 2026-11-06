import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderApp';
import { milo, mockMyReports } from '../test/reports';
import { signedIn, testUser } from '../test/server';

describe('ProfilePage', () => {
  it('has one page title, then a section for the profile and the reports', async () => {
    signedIn();
    mockMyReports([milo]);
    renderApp('/profile');
    await screen.findByRole('heading', { name: 'Milo' });

    const outline = screen
      .getAllByRole('heading')
      .filter((h) => h.tagName !== 'H3')
      .map((h) => `${h.tagName} ${h.textContent}`);
    expect(outline).toEqual([
      `H1 ${testUser.name}'s profile`,
      `H2 ${testUser.name}`,
      'H2 My Active & Historical Incident Reports',
    ]);
  });

  it('keeps the page title out of the profile sidebar', async () => {
    signedIn();
    mockMyReports([]);
    renderApp('/profile');

    const title = await screen.findByRole('heading', { level: 1 });
    expect(
      screen.getByRole('complementary', { name: /your profile/i }),
    ).not.toContainElement(title);
  });
});
