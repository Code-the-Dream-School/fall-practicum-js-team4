import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Link, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { API, server } from '../test/server';
import { ReportPetPage } from './ReportPetPage';

describe('ReportPetPage', () => {
  it('1. resets the form when switching from LOST to FOUND', async () => {
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

  it('2. submits a lost report successfully', async () => {
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

    expect(screen.getByRole('button', { name: 'Submitted' })).toBeDisabled();
  });

  it('3. submits a found report successfully', async () => {
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

    expect(screen.getByRole('button', { name: 'Submitted' })).toBeDisabled();
  });

  it('4. shows an error when report submission fails', async () => {
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

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to create report',
    );

    expect(screen.getByRole('button', { name: 'Submit Report' })).toBeEnabled();
  });

  it('5. submits a report with photos as multipart/form-data', async () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = vi.fn(
      (file: Blob) =>
        `blob:mock-url/${file instanceof File ? file.name : 'photo'}`,
    );

    URL.revokeObjectURL = vi.fn();

    let fetchSpy: ReturnType<typeof vi.spyOn> | undefined;
    try {
      server.use(
        http.post(`${API}/api/reports`, () =>
          HttpResponse.json(
            { success: true, data: { petReportId: 41 } },
            { status: 201 },
          ),
        ),
      );

      const user = userEvent.setup();

      const originalFetch = globalThis.fetch;
      let capturedFormData: FormData | undefined;

      fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation((input, init) => {
          if (
            typeof input === 'string' &&
            input.endsWith('/api/reports') &&
            init?.method === 'POST' &&
            init.body instanceof FormData
          ) {
            capturedFormData = init.body;
          }

          return originalFetch(input, init);
        });

      render(
        <MemoryRouter initialEntries={['/report-pet?type=lost']}>
          <ReportPetPage />
        </MemoryRouter>,
      );

      await user.selectOptions(
        screen.getByLabelText('Pet Type (required)'),
        'DOG',
      );

      await user.type(screen.getByLabelText('Color (required)'), 'Golden');

      await user.selectOptions(
        screen.getByLabelText('Size (required)'),
        'MEDIUM',
      );

      await user.selectOptions(
        screen.getByLabelText('Gender (required)'),
        'FEMALE',
      );

      fireEvent.change(screen.getByLabelText('Date Lost (required)'), {
        target: { value: '2026-10-20' },
      });

      const photo = new File(['dog image'], 'bella.jpg', {
        type: 'image/jpeg',
      });

      await user.upload(screen.getByLabelText(/upload pet photos/i), photo);

      await user.click(screen.getByRole('button', { name: 'Submit Report' }));

      expect(
        await screen.findByText('Your pet report was submitted successfully!'),
      ).toBeInTheDocument();

      expect(capturedFormData).toBeInstanceOf(FormData);

      const formData = capturedFormData!;

      expect(JSON.parse(formData.get('report') as string)).toMatchObject({
        reportType: 'LOST',
        petType: 'DOG',
        color: 'Golden',
        size: 'MEDIUM',
        gender: 'FEMALE',
        eventDate: '2026-10-20T00:00:00.000Z',
      });

      const uploadedPhotos = formData.getAll('photos');

      expect(uploadedPhotos).toHaveLength(1);
      expect(uploadedPhotos[0]).toBeInstanceOf(File);
      expect((uploadedPhotos[0] as File).name).toBe('bella.jpg');
      expect((uploadedPhotos[0] as File).type).toBe('image/jpeg');
    } finally {
      fetchSpy.mockRestore();
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    }
  });

  it('6. resets submission state when switching from LOST to FOUND', async () => {
    server.use(
      http.post(`${API}/api/reports`, () => {
        return HttpResponse.json(
          { success: true, data: { petReportId: 1 } },
          { status: 201 },
        );
      }),
    );

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/report-pet?type=lost']}>
        <Link to="/report-pet?type=found">Switch to Found</Link>
        <Routes>
          <Route path="/report-pet" element={<ReportPetPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.selectOptions(
      screen.getByLabelText('Pet Type (required)'),
      'DOG',
    );
    await user.type(screen.getByLabelText('Color (required)'), 'White');
    await user.selectOptions(
      screen.getByLabelText('Size (required)'),
      'MEDIUM',
    );
    await user.selectOptions(
      screen.getByLabelText('Gender (required)'),
      'MALE',
    );
    fireEvent.change(screen.getByLabelText('Date Lost (required)'), {
      target: { value: '2026-11-01' },
    });
    await user.click(screen.getByRole('button', { name: 'Submit Report' }));

    expect(
      await screen.findByText('Your pet report was submitted successfully!'),
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Submitted' })).toBeDisabled();

    await user.click(screen.getByRole('link', { name: 'Switch to Found' }));

    expect(
      screen.getByRole('heading', { name: 'Report a Pet: FOUND' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Color (required)')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Submit Report' })).toBeEnabled();
    expect(
      screen.queryByText('Your pet report was submitted successfully!'),
    ).not.toBeInTheDocument();
  });
});
