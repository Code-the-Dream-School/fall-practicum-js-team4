import { QueryView } from '../components/QueryView';
import { useReports } from '../features/reports';
import { ReportCard } from '../features/reports/components/ReportCard';
import { textStyles } from '../styles/theme';
import '../features/reports/components/ReportGrid.css';

const RECENT_REPORTS_LIMIT = 6;

export function HomePage() {
  const query = useReports({
    sort: 'newest',
    limit: RECENT_REPORTS_LIMIT,
  });

  return (
    <section>
      <h1 style={textStyles.pageTitle}>Recently reported pets</h1>
      <QueryView query={query} loading="Loading recent reports...">
        {({ reports }) =>
          reports.length === 0 ? (
            <p>No recent reports yet.</p>
          ) : (
            <ul className="report-grid">
              {reports.map((report) => (
                <ReportCard key={report.petReportId} report={report} />
              ))}
            </ul>
          )
        }
      </QueryView>
    </section>
  );
}
