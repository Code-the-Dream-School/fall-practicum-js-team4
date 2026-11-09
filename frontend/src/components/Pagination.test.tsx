import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Pagination } from './Pagination';

const pageNumbers = () =>
  screen
    .getAllByRole('button', { name: /^Page \d+$/ })
    .map((btn) => btn.textContent);

describe('Pagination', () => {
  it.each([0, 1])('renders nothing when totalPages is %i', (totalPages) => {
    const { container } = render(
      <Pagination page={1} totalPages={totalPages} onPageChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders page buttons, disables Previous on page 1, and marks current page', () => {
    render(<Pagination page={1} totalPages={4} onPageChange={vi.fn()} />);

    expect(
      screen.getByRole('navigation', { name: 'Pagination' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Previous page' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: 'Page 2' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('disables Next on the last page and enables Previous', () => {
    render(<Pagination page={4} totalPages={4} onPageChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Page 4' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('calls onPageChange when clicking a page number, Previous, or Next, and ignores clicking the active page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(<Pagination page={2} totalPages={4} onPageChange={onPageChange} />);

    // Clicking the current page should not fire onPageChange
    await user.click(screen.getByRole('button', { name: 'Page 2' }));
    expect(onPageChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Page 4' }));
    expect(onPageChange).toHaveBeenLastCalledWith(4);

    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);
  });

  it('disables all buttons when disabled is true', () => {
    render(
      <Pagination page={2} totalPages={3} onPageChange={vi.fn()} disabled />,
    );

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
  });

  describe('ellipsis truncation', () => {
    it('shows all pages when totalPages is 7 or fewer', () => {
      render(<Pagination page={4} totalPages={7} onPageChange={vi.fn()} />);
      expect(pageNumbers()).toEqual(['1', '2', '3', '4', '5', '6', '7']);
      expect(screen.queryByText('…')).not.toBeInTheDocument();
    });

    it('truncates with a trailing ellipsis when near the start', () => {
      render(<Pagination page={2} totalPages={10} onPageChange={vi.fn()} />);
      expect(pageNumbers()).toEqual(['1', '2', '3', '4', '5', '10']);
      const ellipsis = screen.getAllByText('…');
      expect(ellipsis).toHaveLength(1);
      expect(ellipsis[0].closest('li')).toHaveAttribute('aria-hidden', 'true');
    });

    it('truncates with a leading ellipsis when near the end', () => {
      render(<Pagination page={9} totalPages={10} onPageChange={vi.fn()} />);
      expect(pageNumbers()).toEqual(['1', '6', '7', '8', '9', '10']);
      expect(screen.getAllByText('…')).toHaveLength(1);
    });

    it('truncates with both ellipses when in the middle', () => {
      render(<Pagination page={5} totalPages={10} onPageChange={vi.fn()} />);
      expect(pageNumbers()).toEqual(['1', '4', '5', '6', '10']);
      expect(screen.getAllByText('…')).toHaveLength(2);
    });
  });
});
