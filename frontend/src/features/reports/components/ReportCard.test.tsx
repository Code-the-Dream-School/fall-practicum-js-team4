import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { foundDog, luna, milo } from '../../../test/reports';
import type { PetReport, PublicReport } from '../../../types/reports';
import { ReportCard } from './ReportCard';

function renderCard(pet: PetReport) {
  const publicReport: PublicReport = {
    ...pet,
    photos: pet.photos ?? [],
  };

  render(
    <MemoryRouter>
      <ul>
        <ReportCard report={publicReport} />
      </ul>
    </MemoryRouter>,
  );

  return screen.getByRole('listitem');
}

describe('ReportCard status badges', () => {
  it('1. shows LOST for an active lost report', () => {
    const card = renderCard(milo);

    expect(within(card).getByText('Lost', { exact: true })).toBeInTheDocument();
    expect(card).toHaveClass('report-card--lost');
    expect(within(card).queryByText('REUNITED')).not.toBeInTheDocument();
  });

  it('2. shows FOUND for an active found report', () => {
    const card = renderCard(foundDog);

    expect(
      within(card).getByText('Found', { exact: true }),
    ).toBeInTheDocument();
    expect(card).toHaveClass('report-card--found');
  });

  it('3. shows REUNITED for a reunited report', () => {
    const card = renderCard(luna);

    expect(
      within(card).getByText('REUNITED', { exact: true }),
    ).toBeInTheDocument();
    expect(
      within(card).queryByText('Lost', { exact: true }),
    ).not.toBeInTheDocument();
    expect(card).toHaveClass('report-card--reunited');
    expect(card).not.toHaveClass('report-card--lost');
  });

  it('4. keeps the original event label for a reunited report', () => {
    const card = renderCard(luna);

    expect(
      within(card).getByText('Lost on:', { exact: true }),
    ).toBeInTheDocument();
    expect(within(card).queryByText('REUNITED on:')).not.toBeInTheDocument();
  });
});
