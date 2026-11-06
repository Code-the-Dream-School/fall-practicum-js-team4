import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../../components/Icon';
import { pageItems } from '../pagination';
import './Pagination.css';

interface PaginationProps {
  page: number;
  totalPages: number;
  // The `search` part of the URL for a page, e.g. "?search=dog&page=2"
  hrefFor: (page: number) => string;
  // "Showing 1–6 of 45 lost pets", announced when it changes
  summary: ReactNode;
  // The current page takes the directory's colour
  tone: 'lost' | 'found';
}

// The bar under a directory list, as in the design: the count on the left,
// the pages on the right. Links, not buttons: each page has its own URL.
export function Pagination({
  page,
  totalPages,
  hrefFor,
  summary,
  tone,
}: PaginationProps) {
  const previous = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  return (
    <div className={`pagination pagination--${tone}`}>
      <p role="status" className="pagination__summary">
        <span className="pagination__dot" aria-hidden="true" />
        {summary}
      </p>

      <nav aria-label="Pages" className="pagination__nav">
        {previous ? (
          <Link
            to={{ search: hrefFor(previous) }}
            className="pagination__button"
            aria-label="Previous page"
          >
            <Icon name="chevron_left" />
          </Link>
        ) : (
          <span
            className="pagination__button"
            aria-label="Previous page"
            aria-disabled="true"
          >
            <Icon name="chevron_left" />
          </span>
        )}

        <ul className="pagination__pages">
          {pageItems(page, Math.max(totalPages, 1)).map((item, i) =>
            item === 'gap' ? (
              <li
                key={`gap-${i}`}
                className="pagination__gap"
                aria-hidden="true"
              >
                …
              </li>
            ) : (
              <li key={item}>
                <Link
                  to={{ search: hrefFor(item) }}
                  className="pagination__button"
                  aria-current={item === page ? 'page' : undefined}
                  aria-label={`Page ${item}`}
                >
                  {item}
                </Link>
              </li>
            ),
          )}
        </ul>

        {next ? (
          <Link
            to={{ search: hrefFor(next) }}
            className="pagination__button pagination__button--next"
          >
            Next
            <Icon name="chevron_right" />
          </Link>
        ) : (
          <span
            className="pagination__button pagination__button--next"
            aria-disabled="true"
          >
            Next
            <Icon name="chevron_right" />
          </span>
        )}
      </nav>
    </div>
  );
}
