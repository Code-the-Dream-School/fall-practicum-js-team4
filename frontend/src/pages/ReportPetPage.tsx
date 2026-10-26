import { useSearchParams } from 'react-router';
import { textStyles } from '../styles/theme';
import type { ReportType } from '../types/reports';

export function ReportPetPage() {
  const [params] = useSearchParams();
  const reportType: ReportType =
    params.get('type') === 'found' ? 'FOUND' : 'LOST';

  return <h1 style={textStyles.pageTitle}>Report a pet: {reportType}</h1>;
}
