import { Link } from 'react-router';
import { PATHS } from '../../../app/paths';
import { Icon } from '../../../components/Icon';
import { buttonStyles } from '../../../styles/theme';
import type { PublicReport, ReportType } from '../../../types/reports';
import { ReportCard } from './ReportCard';
import './ReportGrid.css';

const EMPTY = {
  LOST: {
    title: 'No lost pets reported right now',
    text: 'If your pet is missing, file a report so neighbors can help look.',
    cta: 'File Lost Pet Report',
    to: PATHS.reportLost,
    style: buttonStyles.lost,
  },
  FOUND: {
    title: 'No found pets reported right now',
    text: 'Found a pet? File a report so the owner can find it here.',
    cta: 'File Found Pet Report',
    to: PATHS.reportFound,
    style: buttonStyles.found,
  },
} as const;

interface ReportGridProps {
  reports: PublicReport[];
  reportType: ReportType;
}

export function ReportGrid({ reports, reportType }: ReportGridProps) {
  if (reports.length === 0) {
    const empty = EMPTY[reportType];
    return (
      <div className="reports-empty">
        <Icon name="pets" />
        <h2>{empty.title}</h2>
        <p>{empty.text}</p>
        <Link to={empty.to} style={empty.style}>
          {empty.cta}
        </Link>
      </div>
    );
  }

  return (
    <ul className="report-grid">
      {reports.map((report) => (
        <ReportCard key={report.petReportId} report={report} />
      ))}
    </ul>
  );
}
