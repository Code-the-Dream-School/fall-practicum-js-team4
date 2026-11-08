import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { PATHS } from '../app/paths';
import { buttonStyles, textStyles } from '../styles/theme';
import type { ReportType } from '../types/reports';
import { QueryView } from '../components/QueryView';
import { ReportGrid, useReports } from '../features/reports';

const CONTENT: Record<
  ReportType,
  {
    title: string;
    subtitle: string;
    cta: string;
    ctaTo: string;
    ctaStyle: CSSProperties;
    loading: string;
  }
> = {
  LOST: {
    title: 'Lost Pets Directory',
    subtitle: 'Community-reported missing pets.',
    cta: '+ File Lost Pet Report',
    ctaTo: PATHS.reportLost,
    ctaStyle: buttonStyles.lost,
    loading: 'Loading lost pets...',
  },
  FOUND: {
    title: 'Found Pets Directory',
    subtitle: 'Pets found and waiting for their families.',
    cta: '+ File Found Pet Report',
    ctaTo: PATHS.reportFound,
    ctaStyle: buttonStyles.found,
    loading: 'Loading found pets...',
  },
};

interface ReportsDirectoryPageProps {
  reportType: ReportType;
}

export function ReportsDirectoryPage({
  reportType,
}: ReportsDirectoryPageProps) {
  const content = CONTENT[reportType];
  const query = useReports({ type: reportType });

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
        <Link to={content.ctaTo} style={content.ctaStyle}>
          {content.cta}
        </Link>
      </div>

      <QueryView query={query} loading={content.loading}>
        {(data) => (
          <ReportGrid reports={data.reports} reportType={reportType} />
        )}
      </QueryView>
    </section>
  );
}
