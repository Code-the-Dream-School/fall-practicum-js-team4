import { QueryView } from '../components/QueryView';
import {
  ReportFilters,
  hasActiveFilters,
  useReports,
  useReportFilters,
} from '../features/reports';
import { ReportCard } from '../features/reports/components/ReportCard';
import { buttonStyles } from '../styles/theme';
import '../features/reports/components/ReportGrid.css';
import { REPORTS_PER_PAGE } from '../features/reports/constants';
import { Pagination } from '../components/Pagination';
import { ReportPageNotFound } from '../features/reports/components/ReportPageNotFound';
import { Icon } from '../components/Icon';
import './ReportsDirectoryPage.css';
import { ReportsMap } from '../features/reports/components/ReportsMap';
import './HomePage.css';
import { Link } from 'react-router';
import { PATHS } from '../app/paths';

export function HomePage() {
  const { filters, page, updateFilters, clearFilters, setPage } =
    useReportFilters();

  const query = useReports({
    ...filters,
    includeReunited: !filters.status,
    days: 7,
    page,
    limit: REPORTS_PER_PAGE,
  });
  const filtered = hasActiveFilters(filters);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header className="home-hero">
        <p className="home-hero__label">
          <span className="home-hero__dot" aria-hidden="true" />
          Community pet alert network
        </p>
        <h1 className="home-hero__title">
          Reuniting Lost Pets <span>with Their Families</span>
        </h1>

        <p className="home-hero__description">
          Report lost or found pets and help bring them home.
        </p>
      </header>

      <div className="home-report-actions">
        <Link
          to={PATHS.reportLost}
          className="directory-cta directory-cta--lost"
        >
          <Icon name="warning" />
          Report a Lost Pet
        </Link>

        <Link
          to={PATHS.reportFound}
          className="directory-cta directory-cta--found"
        >
          <Icon name="search" />
          Report a Found Pet
        </Link>
      </div>

      <ReportFilters
        filters={filters}
        onChange={updateFilters}
        onClear={clearFilters}
        noun="pets"
        hideSizeAndGender
        showReportType
        showStatus
      />

      <QueryView query={query} loading="Loading recent reports...">
        {({ reports, page: currentPage, totalPages, total, limit }) => (
          <div className="home-results" aria-busy={query.isPlaceholderData}>
            <ReportsMap reports={reports} />
            <div
              className="directory-results home-results__list"
              data-updating={query.isPlaceholderData || undefined}
            >
              <h2 className="home-section-title">
                Recently reported
                <span className="home-section-title__badge">Last 7 days</span>
              </h2>

              <p role="status" className="directory-results__count">
                {reports.length > 0
                  ? `Showing ${(currentPage - 1) * limit + 1}-${
                      (currentPage - 1) * limit + reports.length
                    } of ${total} pets`
                  : '0 pets shown'}
                {filtered ? ' matching your filters' : ''}
              </p>
              {reports.length === 0 && total > 0 ? (
                <ReportPageNotFound
                  page={currentPage}
                  totalPages={totalPages}
                  onGoToFirstPage={() => setPage(1)}
                />
              ) : total === 0 ? (
                <div className="reports-empty">
                  <Icon name={filtered ? 'search_off' : 'pets'} />
                  <h2>
                    {filtered
                      ? 'No reports match your filters.'
                      : 'No recent reports yet.'}
                  </h2>
                  {filtered && (
                    <>
                      <p>Try other words, or remove a filter.</p>
                      <button
                        type="button"
                        onClick={clearFilters}
                        style={buttonStyles.outline}
                      >
                        Clear all filters
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <ul
                  className="report-grid"
                  tabIndex={0}
                  aria-label="Pet reports"
                >
                  {reports.map((report) => (
                    <ReportCard key={report.petReportId} report={report} />
                  ))}
                </ul>
              )}
              {reports.length > 0 && (
                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  disabled={query.isPlaceholderData}
                />
              )}
            </div>
          </div>
        )}
      </QueryView>
    </section>
  );
}
