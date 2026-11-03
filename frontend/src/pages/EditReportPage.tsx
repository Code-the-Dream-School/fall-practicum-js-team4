import { useParams, Link } from 'react-router';
import { PATHS } from '../app/paths';
import { textStyles, buttonStyles } from '../styles/theme';

export function EditReportPage() {
  const { id } = useParams();

  return (
    <section>
      <h1 style={textStyles.pageTitle}>Edit Report</h1>

      <p style={textStyles.pageSubtitle}>
        Edit functionality for report #{id} will be available soon.
      </p>

      <Link to={PATHS.myReports} style={buttonStyles.outline}>
        Back to My Reports
      </Link>
    </section>
  );
}