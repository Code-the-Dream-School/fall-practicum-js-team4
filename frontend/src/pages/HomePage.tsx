import { QueryView } from '../components/QueryView';
import {
  ReportFilters,
  hasActiveFilters,
  useReports,
  useReportFilters,
} from '../features/reports';
import { ReportCard } from '../features/reports/components/ReportCard';
import { buttonStyles, textStyles } from '../styles/theme';
import '../features/reports/components/ReportGrid.css';
import { REPORTS_PER_PAGE } from '../features/reports/constants';
import { Pagination } from '../components/Pagination';
import { ReportPageNotFound } from '../features/reports/components/ReportPageNotFound';
import { Icon } from '../components/Icon';
import './ReportsDirectoryPage.css';

export function HomePage() {
  const { filters, page, updateFilters, clearFilters, setPage } =
    useReportFilters();

  const query = useReports({ ...filters, page, limit: REPORTS_PER_PAGE });
  const filtered = hasActiveFilters(filters);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={textStyles.pageTitle}>Recently reported pets</h1>

      <ReportFilters
        filters={filters}
        onChange={updateFilters}
        onClear={clearFilters}
        noun="pets"
      />

      <QueryView query={query} loading="Loading recent reports...">
        {({ reports, page: currentPage, totalPages, total, limit }) => (
          <div
            className="directory-results"
            aria-busy={query.isPlaceholderData}
            data-updating={query.isPlaceholderData || undefined}
          >
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
              <ul className="report-grid">
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
        )}
      </QueryView>
    </section>
  );
}
