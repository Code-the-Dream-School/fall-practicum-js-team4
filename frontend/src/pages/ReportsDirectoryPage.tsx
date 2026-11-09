import { useRef } from 'react';
import { Link } from 'react-router';
import { PATHS } from '../app/paths';
import { buttonStyles, textStyles } from '../styles/theme';
import type { ReportListResponse, ReportType } from '../types/reports';
import { Icon } from '../components/Icon';
import { Pagination } from '../components/Pagination';
import { QueryView } from '../components/QueryView';
import {
  ReportFilters,
  ReportGrid,
  hasActiveFilters,
  useReportFilters,
  useReports,
} from '../features/reports';
import './ReportsDirectoryPage.css';

// 6 cards per page (a 3 x 2 grid), as in the design
const REPORTS_PER_PAGE = 6;

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

// "3 lost pets match your filters", "Showing 7–12 of 45 lost pets"
const resultsSummary = (
  { reports, total, page, limit }: ReportListResponse,
  noun: string,
  filtered: boolean,
) => {
  const count =
    total === 1 ? `1 ${noun.replace(/s$/, '')}` : `${total} ${noun}`;
  const partial = reports.length > 0 && reports.length < total;
  const first = (page - 1) * limit + 1;
  const shown = partial
    ? `Showing ${first}–${first + reports.length - 1} of ${count}`
    : count;
  if (!filtered) return shown;
  return partial
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
  const { filters, page, updateFilters, clearFilters, setPage } =
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

  // After changing page, continue reading from the top of the results
  // (keyboard and screen reader users too). Done on the click, not in an
  // effect, so a filter change or Back never pulls focus from where it is.
  const countRef = useRef<HTMLParagraphElement>(null);
  const goToPage = (target: number) => {
    setPage(target);
    countRef.current?.focus({ preventScroll: true });
    countRef.current?.scrollIntoView?.({ block: 'start' });
  };

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
            {/* Always shown, even with a single page; focus lands here after
                changing page */}
            <p
              ref={countRef}
              tabIndex={-1}
              role="status"
              className="directory-results__count"
            >
              {resultsSummary(data, content.noun, filtered)}
            </p>
            {data.reports.length === 0 && data.total > 0 ? (
              // An old link, or reports were reunited while on the last page
              <div className="reports-empty">
                <Icon name="find_in_page" />
                <h2>There's no page {data.page}</h2>
                <p>
                  The list has {data.totalPages}{' '}
                  {data.totalPages === 1 ? 'page' : 'pages'}.
                </p>
                <button
                  type="button"
                  onClick={() => goToPage(1)}
                  style={buttonStyles.outline}
                >
                  Go to the first page
                </button>
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
                <Pagination
                  page={data.page}
                  totalPages={data.totalPages}
                  onPageChange={goToPage}
                  disabled={query.isPlaceholderData}
                />
              </>
            )}
          </div>
        )}
      </QueryView>
    </section>
  );
}
