import { QueryView } from '../components/QueryView';
import { useReports, useReportFilters } from '../features/reports';
import { ReportCard } from '../features/reports/components/ReportCard';
import { textStyles } from '../styles/theme';
import '../features/reports/components/ReportGrid.css';
import { REPORTS_PER_PAGE } from '../features/reports/constants';
import { Pagination } from '../components/Pagination';
import { ReportPageNotFound } from '../features/reports/components/ReportPageNotFound';

export function HomePage() {
  const { page, setPage } = useReportFilters();

  const query = useReports({
    sort: 'newest',
    page,
    limit: REPORTS_PER_PAGE,
  });

  return (
    <section>
      <h1 style={textStyles.pageTitle}>Recently reported pets</h1>
      <QueryView query={query} loading="Loading recent reports...">
        {({ reports, page: currentPage, totalPages, total }) => (
          <div aria-busy={query.isPlaceholderData}>
            {reports.length === 0 && total > 0 ? (
              <ReportPageNotFound
                page={currentPage}
                totalPages={totalPages}
                onGoToFirstPage={() => setPage(1)}
              />
            ) : total === 0 ? (
              <p>No recent reports yet.</p>
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
