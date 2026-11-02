import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Link, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ReportPetPage } from './ReportPetPage';

describe('ReportPetPage', () => {
  it('resets the form when switching from LOST to FOUND', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/report-pet?type=lost']}>
        <Link to="/report-pet?type=found">Switch to Found</Link>
        <Routes>
          <Route path="/report-pet" element={<ReportPetPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const petName = screen.getByLabelText('Pet Name (optional)');

    await user.type(petName, 'Buddy');
    expect(petName).toHaveValue('Buddy');

    await user.click(screen.getByRole('link', { name: 'Switch to Found' }));

    expect(
      screen.getByRole('heading', { name: 'Report a Pet: FOUND' }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText('Pet Name (optional)')).toHaveValue('');
  });
});
