import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { PATHS } from '../app/paths';
import { buttonStyles, textStyles } from '../styles/theme';
import type { ReportListResponse, ReportType } from '../types/reports';
import { Icon } from '../components/Icon';
import { QueryView } from '../components/QueryView';
import {
  Pagination,
  REPORTS_PER_PAGE,
  ReportFilters,
  ReportGrid,
  hasActiveFilters,
  useReportFilters,
  useReports,
} from '../features/reports';
import './ReportsDirectoryPage.css';

const CONTENT: Record<
  ReportType,
  {
    title: string;
    subtitle: string;
    cta: string;
    ctaTo: string;
    tone: 'lost' | 'found';
    loading: string;
    // Plural, lowercase: "3 lost pets"
    noun: string;
  }
> = {
  LOST: {
    title: 'Lost Pets Directory',
    subtitle: 'Community-reported missing pets.',
    cta: '+ File Lost Pet Report',
    ctaTo: PATHS.reportLost,
    tone: 'lost',
    loading: 'Loading lost pets...',
    noun: 'lost pets',
  },
  FOUND: {
    title: 'Found Pets Directory',
    subtitle: 'Pets found and waiting for their families.',
    cta: '+ File Found Pet Report',
    ctaTo: PATHS.reportFound,
    tone: 'found',
    loading: 'Loading found pets...',
    noun: 'found pets',
  },
};

// "3 lost pets match your filters", "Showing 21–40 of 45 lost pets"
const resultsSummary = (
  { reports, total, page, limit }: ReportListResponse,
  noun: string,
  filtered: boolean,
) => {
  const count =
    total === 1 ? `1 ${noun.replace(/s$/, '')}` : `${total} ${noun}`;
  const first = (page - 1) * limit + 1;
  const shown =
    reports.length < total
      ? `Showing ${first}–${first + reports.length - 1} of ${count}`
      : count;
  if (!filtered) return shown;
  return reports.length < total
    ? `${shown} matching your filters`
    : `${count} ${total === 1 ? 'matches' : 'match'} your filters`;
};

interface ReportsDirectoryPageProps {
  reportType: ReportType;
}

export function ReportsDirectoryPage({
  reportType,
}: ReportsDirectoryPageProps) {
  const content = CONTENT[reportType];
  const { filters, page, updateFilters, clearFilters, pageHref } =
    useReportFilters();
  const query = useReports({
    type: reportType,
    ...filters,
    // Page 1 is the API's default: leave it out so the request stays short
    page: page > 1 ? page : undefined,
    limit: REPORTS_PER_PAGE,
  });
  const filtered = hasActiveFilters(filters);
  // Older results stay visible while the new ones load
  const updating = query.isPlaceholderData;

  // After moving to another page, start reading from the top of the results
  // (keyboard and screen reader users too), instead of staying at the bottom
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const shownPage = useRef(page);
  useEffect(() => {
    if (page === shownPage.current) return;
    shownPage.current = page;
    resultsRef.current?.focus({ preventScroll: true });
    resultsRef.current?.scrollIntoView?.({ block: 'start' });
  }, [page]);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <h1 style={textStyles.pageTitle}>{content.title}</h1>
          <p style={textStyles.pageSubtitle}>{content.subtitle}</p>
        </div>
        <Link
          to={content.ctaTo}
          className={`directory-cta directory-cta--${content.tone}`}
        >
          <Icon
            name={content.tone === 'lost' ? 'add_alert' : 'add_location_alt'}
          />
          {content.cta}
        </Link>
      </div>

      <ReportFilters
        filters={filters}
        onChange={updateFilters}
        onClear={clearFilters}
        noun={content.noun}
      />

      <QueryView query={query} loading={content.loading}>
        {(data) => (
          <div
            className="directory-results"
            aria-busy={updating}
            data-updating={updating || undefined}
          >
            {/* Where focus lands after changing page; the count is in the bar below */}
            <h2
              ref={resultsRef}
              tabIndex={-1}
              className="visually-hidden directory-results__title"
            >
              {content.title}, page {data.page} of{' '}
              {Math.max(data.totalPages, 1)}
            </h2>
            {data.reports.length === 0 && data.total > 0 ? (
              // An old link to a page that no longer exists (?page=99)
              <div className="reports-empty">
                <Icon name="find_in_page" />
                <h2>There's no page {data.page}</h2>
                <p>
                  The list has {data.totalPages}{' '}
                  {data.totalPages === 1 ? 'page' : 'pages'}.
                </p>
                <Link to={{ search: pageHref(1) }} style={buttonStyles.outline}>
                  Go to the first page
                </Link>
              </div>
            ) : filtered && data.reports.length === 0 ? (
              <div className="reports-empty">
                <Icon name="search_off" />
                <h2>No {content.noun} match your search</h2>
                <p>Try other words, or remove a filter.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  style={buttonStyles.outline}
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <ReportGrid reports={data.reports} reportType={reportType} />
                {data.reports.length > 0 && (
                  <Pagination
                    page={data.page}
                    totalPages={data.totalPages}
                    hrefFor={pageHref}
                    summary={resultsSummary(data, content.noun, filtered)}
                    tone={content.tone}
                  />
                )}
              </>
            )}
          </div>
        )}
      </QueryView>
    </section>
  );
}
