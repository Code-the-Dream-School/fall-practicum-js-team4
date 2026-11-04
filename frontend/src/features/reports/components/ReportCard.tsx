import { Link } from 'react-router';
import { PATHS } from '../../../app/paths';
import { Icon } from '../../../components/Icon';
import type { PublicReport } from '../../../types/reports';
import {
  formatEventDate,
  formatLocation,
  reportSummary,
  reportTitle,
} from '../format';

const DATE_LABEL = { LOST: 'Lost', FOUND: 'Found' } as const;

export function ReportCard({ report }: { report: PublicReport }) {
  const photo = report.photos[0];
  const location = formatLocation(report.location);
  const tone = report.reportType === 'LOST' ? 'lost' : 'found';

  return (
    <li>
      <Link
        to={PATHS.petDetails(String(report.petReportId))}
        className={`report-card report-card--${tone}`}
      >
        <div className="report-card__media">
          {photo ? (
            // The title below already names the pet, so the photo is decorative
            <img src={photo.imageUrl} alt="" loading="lazy" />
          ) : (
            <div className="report-card__no-photo">
              <Icon name="pets" />
              <span>No photo</span>
            </div>
          )}
          <span className="report-card__badge">{report.reportType}</span>
        </div>

        <div className="report-card__body">
          <h2 className="report-card__title">{reportTitle(report)}</h2>
          <p className="report-card__summary">{reportSummary(report)}</p>
          <p className="report-card__meta">
            <Icon name="location_on" /> {location ?? 'Location not given'}
          </p>
          <p className="report-card__meta">
            <Icon name="calendar_month" /> {DATE_LABEL[report.reportType]}{' '}
            {formatEventDate(report.eventDate)}
          </p>
          {report.distinctiveFeatures && (
            <p className="report-card__features">
              {report.distinctiveFeatures}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
