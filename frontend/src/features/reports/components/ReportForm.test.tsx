import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportForm, type ReportFormValues } from './ReportForm';
import userEvent from '@testing-library/user-event';

describe('ReportForm', () => {
  const mockSubmit = vi.fn<
    (values: ReportFormValues, photos: File[]) => Promise<void>
  >(async () => {});

  beforeEach(() => {
    mockSubmit.mockClear();
  });

  it('renders required fields for a lost report', () => {
    render(<ReportForm reportType="LOST" onSubmit={mockSubmit} />);

    expect(screen.getByLabelText('Pet Type (required)')).toBeInTheDocument();
    expect(screen.getByLabelText('Date Lost (required)')).toBeInTheDocument();
  });

  it('renders required fields for a found report', () => {
    render(<ReportForm reportType="FOUND" onSubmit={mockSubmit} />);

    expect(screen.getByLabelText('Pet Type (required)')).toBeInTheDocument();
    expect(screen.getByLabelText('Date Found (required)')).toBeInTheDocument();
  });

  it('prevents submission when required fields are missing', async () => {
    const user = userEvent.setup();
    render(<ReportForm reportType="LOST" onSubmit={mockSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Submit Report' }));

    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('prevents submission when location is incomplete', async () => {
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
    await user.type(screen.getByLabelText('ZIP Code (optional)'), '23220');

    await user.click(screen.getByRole('button', { name: 'Submit Report' }));

    expect(
      await screen.findByText('City is required when providing a location'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('State is required when providing a location'),
    ).toBeInTheDocument();

    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('prevents submission when city exceeds 100 characters', async () => {
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

    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('clears location errors when all location fields are emptied', async () => {
    const user = userEvent.setup();
    render(<ReportForm reportType="LOST" onSubmit={mockSubmit} />);

    await user.type(
      screen.getByLabelText('City (required if providing location)'),
      'A',
    );
    await user.click(screen.getByRole('button', { name: 'Submit Report' }));

    expect(
      await screen.findByText('ZIP code is required when providing a location'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('State is required when providing a location'),
    ).toBeInTheDocument();

    await user.clear(
      screen.getByLabelText('City (required if providing location)'),
    );

    await waitFor(() => {
      expect(
        screen.queryByText('ZIP code is required when providing a location'),
      ).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(
        screen.queryByText('State is required when providing a location'),
      ).not.toBeInTheDocument();
    });
  });

  it('prevents submission when the event date is in the future', async () => {
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
      target: { value: '2099-01-01' },
    });

    await user.click(screen.getByRole('button', { name: 'Submit Report' }));

    expect(
      await screen.findByText('Enter a valid date that is not in the future'),
    ).toBeInTheDocument();

    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('passes selected photos to the submit handler', async () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    globalThis.URL.createObjectURL = vi.fn(
      (file: File) => `blob:mock-url/${file.name}`,
    );
    globalThis.URL.revokeObjectURL = vi.fn();

    try {
      const user = userEvent.setup();
      render(<ReportForm reportType="LOST" onSubmit={mockSubmit} />);

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

      const photoInput = screen.getByLabelText(/upload pet photos/i);
      const photo = new File(['dog image'], 'bella.jpg', {
        type: 'image/jpeg',
      });
      await user.upload(photoInput, photo);

      await user.click(screen.getByRole('button', { name: 'Submit Report' }));

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            petType: 'DOG',
            color: 'Golden',
            size: 'MEDIUM',
            gender: 'FEMALE',
            eventDate: '2026-10-20',
          }),
          [photo],
        );
      });
    } finally {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    }
  });
});
