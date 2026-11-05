import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Link, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { API, server } from '../test/server';
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

  it('submits a lost report successfully', async () => {
    let requestBody: unknown;

    server.use(
      http.post(`${API}/api/reports`, async ({ request }) => {
        requestBody = await request.json();

        return HttpResponse.json(
          { success: true, data: { petReportId: 1 } },
          { status: 201 },
        );
      }),
    );

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/report-pet?type=lost']}>
        <ReportPetPage />
      </MemoryRouter>,
    );

    await user.selectOptions(
      screen.getByLabelText('Pet Type (required)'),
      'DOG',
    );
    await user.type(screen.getByLabelText('Color (required)'), 'Brown');
    await user.selectOptions(screen.getByLabelText('Size (required)'), 'SMALL');
    await user.selectOptions(
      screen.getByLabelText('Gender (required)'),
      'MALE',
    );

    fireEvent.change(screen.getByLabelText('Date Lost (required)'), {
      target: { value: '2026-10-20' },
    });

    await user.click(screen.getByRole('button', { name: 'Submit Report' }));

    expect(
      await screen.findByText('Your pet report was submitted successfully!'),
    ).toBeInTheDocument();

    expect(requestBody).toMatchObject({
      reportType: 'LOST',
      petType: 'DOG',
      color: 'Brown',
      size: 'SMALL',
      gender: 'MALE',
      eventDate: '2026-10-20T00:00:00.000Z',
    });

    expect(requestBody).not.toHaveProperty('location');

    expect(
      screen.getByRole('button', { name: 'Submit Report' }),
    ).toBeDisabled();
  });

  it('submits a found report successfully', async () => {
    let requestBody: unknown;

    server.use(
      http.post(`${API}/api/reports`, async ({ request }) => {
        requestBody = await request.json();

        return HttpResponse.json(
          { success: true, data: { petReportId: 1 } },
          { status: 201 },
        );
      }),
    );

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/report-pet?type=found']}>
        <ReportPetPage />
      </MemoryRouter>,
    );

    await user.selectOptions(
      screen.getByLabelText('Pet Type (required)'),
      'DOG',
    );
    await user.type(screen.getByLabelText('Color (required)'), 'Brown');
    await user.selectOptions(screen.getByLabelText('Size (required)'), 'SMALL');
    await user.selectOptions(
      screen.getByLabelText('Gender (required)'),
      'MALE',
    );

    fireEvent.change(screen.getByLabelText('Date Found (required)'), {
      target: { value: '2026-10-20' },
    });

    await user.type(screen.getByLabelText('ZIP Code (optional)'), '23220');
    await user.type(
      screen.getByLabelText('City (required if providing location)'),
      'Richmond',
    );

    await user.type(
      screen.getByLabelText('State (required if providing location)'),
      'VA',
    );

    await user.click(screen.getByRole('button', { name: 'Submit Report' }));

    expect(
      await screen.findByText('Your pet report was submitted successfully!'),
    ).toBeInTheDocument();

    expect(requestBody).toMatchObject({
      reportType: 'FOUND',
      petType: 'DOG',
      color: 'Brown',
      size: 'SMALL',
      gender: 'MALE',
      eventDate: '2026-10-20T00:00:00.000Z',
    });

    expect(requestBody).toHaveProperty('location', {
      zipCode: '23220',
      city: 'Richmond',
      state: 'VA',
    });

    expect(
      screen.getByRole('button', { name: 'Submitting...' }),
    ).toBeDisabled();
  });

  it('shows an error when report submission fails', async () => {
    server.use(
      http.post(`${API}/api/reports`, () =>
        HttpResponse.json(
          {
            success: false,
            code: 'INTERNAL_ERROR',
            message: 'Unable to create report',
          },
          { status: 500 },
        ),
      ),
    );

    const user = userEvent.setup();
    render(<ReportForm reportType="LOST" onSubmit={mockSubmit} />);

    await user.selectOptions(
      screen.getByLabelText('Pet Type (required)'),
      'DOG',
    );
    await user.type(screen.getByLabelText('Color (required)'), 'Brown');
    await user.selectOptions(screen.getByLabelText('Size (required)'), 'SMALL');
    await user.selectOptions(
      screen.getByLabelText('Gender (required)'),
      'MALE',
    );

    fireEvent.change(screen.getByLabelText('Date Lost (required)'), {
      target: { value: '2026-10-20' },
    });

    await user.click(screen.getByRole('button', { name: 'Submit Report' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to create report',
    );
  });
});
