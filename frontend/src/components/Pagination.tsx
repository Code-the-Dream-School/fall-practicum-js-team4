import type { ReactNode } from 'react';
import { Icon } from './Icon';
import './Pagination.css';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
  children?: ReactNode;
}

type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

function getPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (page <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-end', totalPages];
  }

  if (page >= totalPages - 3) {
    return [
      1,
      'ellipsis-start',
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    'ellipsis-start',
    page - 1,
    page,
    page + 1,
    'ellipsis-end',
    totalPages,
  ];
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  ariaLabel = 'Pagination',
  children,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const items = getPageItems(page, totalPages);

  return (
    <div className="pagination">
      {children && <div className="pagination__info">{children}</div>}
      <nav className="pagination__controls" aria-label={ariaLabel}>
        <button
          type="button"
          className="pagination__button pagination__button--prev"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          aria-label="Previous page"
        >
          <Icon name="chevron_left" />
        </button>

        <ul className="pagination__list">
          {items.map((item) => {
            if (typeof item !== 'number') {
              return (
                <li key={item}>
                  <span className="pagination__ellipsis" aria-hidden="true">
                    …
                  </span>
                </li>
              );
            }

            const isCurrent = item === page;
            return (
              <li key={item}>
                <button
                  type="button"
                  className={`pagination__button${isCurrent ? ' pagination__button--active' : ''}`}
                  aria-label={`Page ${item}`}
                  aria-current={isCurrent ? 'page' : undefined}
                  disabled={disabled}
                  onClick={() => {
                    if (!isCurrent) onPageChange(item);
                  }}
                >
                  {item}
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="pagination__button pagination__button--next"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
          aria-label="Next page"
        >
          <span>Next</span>
          <Icon name="chevron_right" />
        </button>
      </nav>
    </div>
  );
}
