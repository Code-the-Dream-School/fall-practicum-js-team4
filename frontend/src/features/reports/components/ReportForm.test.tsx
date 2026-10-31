import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReportForm } from './ReportForm';

import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { API, server } from '../../../test/server';

describe('ReportForm', () => {
  it('renders required fields for a lost report', () => {
    render(<ReportForm reportType="LOST" />);

    expect(screen.getByLabelText('Pet Type (required)')).toBeInTheDocument();
    expect(screen.getByLabelText('Date Lost (required)')).toBeInTheDocument();
  });

  it('renders required fields for a found report', () => {
    render(<ReportForm reportType="FOUND" />);

    expect(screen.getByLabelText('Pet Type (required)')).toBeInTheDocument();
    expect(screen.getByLabelText('Date Found (required)')).toBeInTheDocument();
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
    render(<ReportForm reportType="LOST" />);

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
    render(<ReportForm reportType="FOUND" />);

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
      screen.getByRole('button', { name: 'Submit Report' }),
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
    render(<ReportForm reportType="LOST" />);

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

  it('prevents submission when required fields are missing', async () => {
    let submissionCount = 0;

    server.use(
      http.post(`${API}/api/reports`, () => {
        submissionCount += 1;
        return HttpResponse.json(
          { success: true, data: { petReportId: 1 } },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    render(<ReportForm reportType="LOST" />);

    await user.click(screen.getByRole('button', { name: 'Submit Report' }));

    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
    expect(submissionCount).toBe(0);
  });

  it('prevents submission when location is incomplete', async () => {
    let submissionCount = 0;

    server.use(
      http.post(`${API}/api/reports`, () => {
        submissionCount += 1;
        return HttpResponse.json(
          { success: true, data: { petReportId: 1 } },
          { status: 201 },
        );
      }),
    );

    const user = userEvent.setup();
    render(<ReportForm reportType="LOST" />);

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
    await user.type(screen.getByLabelText('ZIP Code (optional)'), '23220');

    await user.click(screen.getByRole('button', { name: 'Submit Report' }));

    expect(
      await screen.findByText('City is required when providing a location'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('State is required when providing a location'),
    ).toBeInTheDocument();

    expect(submissionCount).toBe(0);
  });

  it('prevents submission when city exceeds 100 characters', async () => {
    let submissionCount = 0;

    server.use(
      http.post(`${API}/api/reports`, () => {
        submissionCount += 1;
        return HttpResponse.json({ success: true }, { status: 201 });
      }),
    );

    const user = userEvent.setup();
    render(<ReportForm reportType="LOST" />);

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

    await user.type(screen.getByLabelText('ZIP Code (optional)'), '23220');

    fireEvent.change(
      screen.getByLabelText('City (required if providing location)'),
      { target: { value: 'A'.repeat(101) } },
    );

    await user.type(
      screen.getByLabelText('State (required if providing location)'),
      'VA',
    );

    await user.click(screen.getByRole('button', { name: 'Submit Report' }));

    expect(
      await screen.findByText('City must be 100 characters or fewer'),
    ).toBeInTheDocument();

    expect(submissionCount).toBe(0);
  });

  it('prevents submission when the event date is in the future', async () => {
    let submissionCount = 0;

    server.use(
      http.post(`${API}/api/reports`, () => {
        submissionCount += 1;
        return HttpResponse.json({ success: true }, { status: 201 });
      }),
    );

    const user = userEvent.setup();
    render(<ReportForm reportType="LOST" />);

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
      target: { value: '2099-01-01' },
    });

    await user.click(screen.getByRole('button', { name: 'Submit Report' }));

    expect(
      await screen.findByText('Enter a valid date that is not in the future'),
    ).toBeInTheDocument();

    expect(submissionCount).toBe(0);
  });
});
