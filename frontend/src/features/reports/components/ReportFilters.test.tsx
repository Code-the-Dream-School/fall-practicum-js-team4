import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReportFilters } from './ReportFilters';

const renderFilters = () => {
  const onChange = vi.fn();
  render(
    <ReportFilters
      filters={{}}
      onChange={onChange}
      onClear={vi.fn()}
      noun="pets"
      hideSizeAndGender
      showReportType
      showStatus
    />,
  );
  return { user: userEvent.setup(), onChange };
};

describe('ReportFilters', () => {
  it('1. shows separate report type and status filters', () => {
    renderFilters();

    expect(screen.getByRole('combobox', { name: 'Report type' })).toHaveValue(
      '',
    );
    expect(screen.getByRole('combobox', { name: 'Report status' })).toHaveValue(
      '',
    );
  });

  it.each(['LOST', 'FOUND'])(
    '2. calls onChange with report type %s',
    async (type) => {
      const { user, onChange } = renderFilters();
      await user.selectOptions(
        screen.getByRole('combobox', { name: 'Report type' }),
        type,
      );

      expect(onChange).toHaveBeenCalledExactlyOnceWith({ type });
    },
  );

  it.each(['ACTIVE', 'REUNITED'])(
    '3. calls onChange with status %s',
    async (status) => {
      const { user, onChange } = renderFilters();
      await user.selectOptions(
        screen.getByRole('combobox', { name: 'Report status' }),
        status,
      );

      expect(onChange).toHaveBeenCalledExactlyOnceWith({ status });
    },
  );

  it('4. clears the status when All statuses is selected', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ReportFilters
        filters={{ status: 'REUNITED' }}
        onChange={onChange}
        onClear={vi.fn()}
        noun="pets"
        showStatus
      />,
    );

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Report status' }),
      '',
    );

    expect(onChange).toHaveBeenCalledExactlyOnceWith({
      status: undefined,
    });
  });

  it('5. clears the report type when All report types is selected', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ReportFilters
        filters={{ type: 'LOST' }}
        onChange={onChange}
        onClear={vi.fn()}
        noun="pets"
        showReportType
      />,
    );

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Report type' }),
      '',
    );

    expect(onChange).toHaveBeenCalledExactlyOnceWith({
      type: undefined,
    });
  });

  it('6. hides report type and status filters by default', () => {
    render(
      <ReportFilters
        filters={{}}
        onChange={vi.fn()}
        onClear={vi.fn()}
        noun="pets"
      />,
    );

    expect(
      screen.queryByRole('combobox', { name: 'Report type' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('combobox', { name: 'Report status' }),
    ).not.toBeInTheDocument();
  });
});
