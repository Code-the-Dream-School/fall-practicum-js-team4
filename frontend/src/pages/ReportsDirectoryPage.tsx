import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { PATHS } from '../app/paths';
import { buttonStyles, textStyles } from '../styles/theme';
import type { ReportType } from '../types/reports';
import { Pagination } from '../components/Pagination';
import { QueryView } from '../components/QueryView';
import { ReportGrid, useReports } from '../features/reports';

const REPORTS_PER_PAGE = 6;

const CONTENT: Record<
  ReportType,
  {
    title: string;
    subtitle: string;
    cta: string;
    ctaTo: string;
    ctaStyle: CSSProperties;
    loading: string;
    summaryLabel: string;
  }
> = {
  LOST: {
    title: 'Lost Pets Directory',
    subtitle: 'Community-reported missing pets.',
    cta: '+ File Lost Pet Report',
    ctaTo: PATHS.reportLost,
    ctaStyle: buttonStyles.lost,
    loading: 'Loading lost pets...',
    summaryLabel: 'Active Lost Pet Reports',
  },
  FOUND: {
    title: 'Found Pets Directory',
    subtitle: 'Pets found and waiting for their families.',
    cta: '+ File Found Pet Report',
    ctaTo: PATHS.reportFound,
    ctaStyle: buttonStyles.found,
    loading: 'Loading found pets...',
    summaryLabel: 'Active Found Pet Reports',
  },
};

interface ReportsDirectoryPageProps {
  reportType: ReportType;
}

export function ReportsDirectoryPage({
  reportType,
}: ReportsDirectoryPageProps) {
  const content = CONTENT[reportType];
  const [pageState, setPageState] = useState({ reportType, page: 1 });
  const page = pageState.reportType === reportType ? pageState.page : 1;
  const query = useReports({
    type: reportType,
    page,
    limit: REPORTS_PER_PAGE,
  });
  const handlePageChange = (nextPage: number) => {
    setPageState({ reportType, page: nextPage });
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
        <Link to={content.ctaTo} style={content.ctaStyle}>
          {content.cta}
        </Link>
      </div>

      <QueryView query={query} loading={content.loading}>
        {(data) => (
          <>
            <ReportGrid reports={data.reports} reportType={reportType} />
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={handlePageChange}
            >
              <span className="pagination__dot" aria-hidden="true" />
              <span>
                Showing <strong>{data.reports.length}</strong> of{' '}
                <strong>{data.total}</strong> {content.summaryLabel}
              </span>
            </Pagination>
          </>
        )}
      </QueryView>
    </section>
  );
}
