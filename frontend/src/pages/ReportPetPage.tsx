import { useSearchParams } from 'react-router';
import { ReportForm } from '../features/reports/components/ReportForm';
import { textStyles } from '../styles/theme';

import type { ReportType } from '../types/reports';
import './ReportPetPage.css';

export function ReportPetPage() {
  const [params] = useSearchParams();
  const reportType: ReportType =
    params.get('type') === 'found' ? 'FOUND' : 'LOST';

  return (
    <div className="report-pet-page">
      <section className="report-pet-page__card">
        <h1 style={textStyles.pageTitle}>Report a Pet: {reportType}</h1>
        <ReportForm key={reportType} reportType={reportType} />
      </section>
    </div>
  );
}
