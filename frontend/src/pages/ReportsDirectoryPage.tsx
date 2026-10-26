import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { PATHS } from '../app/paths';
import { buttonStyles, textStyles } from '../styles/theme';
import type { ReportType } from '../types/reports';

const CONTENT: Record<
  ReportType,
  {
    title: string;
    subtitle: string;
    cta: string;
    ctaTo: string;
    ctaStyle: CSSProperties;
  }
> = {
  LOST: {
    title: 'Lost Pets Directory',
    subtitle: 'Community-reported missing pets.',
    cta: '+ File Lost Pet Report',
    ctaTo: PATHS.reportLost,
    ctaStyle: buttonStyles.lost,
  },
  FOUND: {
    title: 'Found Pets Directory',
    subtitle: 'Pets found and waiting for their families.',
    cta: '+ File Found Pet Report',
    ctaTo: PATHS.reportFound,
    ctaStyle: buttonStyles.found,
  },
};

interface ReportsDirectoryPageProps {
  reportType: ReportType;
}

export function ReportsDirectoryPage({
  reportType,
}: ReportsDirectoryPageProps) {
  const content = CONTENT[reportType];
  // TODO: const { reports, filters, setFilters } = usePetReports({ reportType });

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

      <p style={textStyles.pageSubtitle}>Filters and pet cards go here.</p>

      {/* temporary link to check the details route */}
      <Link to={PATHS.petDetails('demo-1')} style={textStyles.link}>
        Open demo pet details
      </Link>
    </section>
  );
}
