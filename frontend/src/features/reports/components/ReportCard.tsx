import { Link } from 'react-router';
import { PATHS } from '../../../app/paths';
import { Icon } from '../../../components/Icon';
import type { PublicReport } from '../../../types/reports';
import {
  REPORT_TYPE,
  formatEventDate,
  formatLocation,
  reportSummary,
  reportTitle,
} from '../format';

export function ReportCard({ report }: { report: PublicReport }) {
  const photo = report.photos[0];
  const location = formatLocation(report.location);
  const tone = report.reportType === 'LOST' ? 'lost' : 'found';
  const typeLabel = REPORT_TYPE[report.reportType];

  return (
    <li className={`report-card report-card--${tone}`}>
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
        <span className="report-card__badge">
          <span className="report-card__badge-dot" aria-hidden="true" />
          {typeLabel}
        </span>
      </div>

      <div className="report-card__body">
        <h2 className="report-card__title">
          {/* Only the pet's name is the link text, so screen readers announce
              a short link. Its ::after covers the card to keep it clickable. */}
          <Link
            to={PATHS.petDetails(String(report.petReportId))}
            className="report-card__link"
          >
            {reportTitle(report)}
          </Link>
        </h2>
        <p className="report-card__summary">{reportSummary(report)}</p>

        <div className="report-card__facts">
          <p className="report-card__fact">
            <Icon
              name="location_on"
              className="report-card__icon report-card__icon--accent"
            />
            <span>
              <strong>
                {report.reportType === 'LOST' ? 'Last seen:' : 'Found at:'}
              </strong>{' '}
              {location ?? 'Location not given'}
            </span>
          </p>
          <p className="report-card__fact">
            <Icon
              name="calendar_month"
              className="report-card__icon report-card__icon--accent"
            />
            <span>
              <strong>{typeLabel} on:</strong>{' '}
              {formatEventDate(report.eventDate)}
            </span>
          </p>
          {report.distinctiveFeatures && (
            <p className="report-card__fact">
              <Icon
                name="info"
                className="report-card__icon report-card__icon--info"
              />
              <span>
                <strong>Distinctive:</strong> {report.distinctiveFeatures}
              </span>
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
