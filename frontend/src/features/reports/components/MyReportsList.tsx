import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../../components/Icon';
import { QueryView } from '../../../components/QueryView';
import { Toast } from '../../../components/Toast';
import { PATHS } from '../../../app/paths';
import type { PetReport } from '../../../types/reports';
import { useMyReports } from '../hooks/useMyReports';
import { MarkReunitedButton } from './MarkReunitedButton';
import './MyReportsList.css';

// Event dates are stored as midnight UTC: format in UTC so they don't move a day
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

const capitalize = (word: string) =>
  word.charAt(0) + word.slice(1).toLowerCase();

// Breeds are typed by users ("siamese"): capitalize each word, keep the rest
// as typed so abbreviations stay ("GSD mix" -> "GSD Mix")
const titleCase = (text: string) =>
  text.trim().replace(/(^|\s)(\S)/g, (_, space, c) => space + c.toUpperCase());

// Reunited replaces the lost/found look, as in the design
const cardVariant = (report: PetReport) => {
  if (report.status === 'REUNITED') {
    return { tone: 'reunited', label: 'Reunited safe' };
  }
  return report.reportType === 'LOST'
    ? { tone: 'lost', label: 'Lost pet' }
    : { tone: 'found', label: 'Found pet' };
};

interface MyReportCardProps {
  report: PetReport;
  onReunited: () => void;
}

function MyReportCard({ report, onReunited }: MyReportCardProps) {
  const lost = report.reportType === 'LOST';
  const reunited = report.status === 'REUNITED';
  const title =
    report.petName ||
    `${lost ? 'Lost' : 'Found'} ${report.petType.toLowerCase()}`;
  const details = [
    capitalize(report.petType),
    report.breed && titleCase(report.breed),
    report.gender !== 'UNKNOWN' && capitalize(report.gender),
  ].filter(Boolean);
  const { tone, label } = cardVariant(report);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // The button that had focus is gone once reunited: continue from the card
  const handleReunited = () => {
    headingRef.current?.focus();
    onReunited();
  };
  const photo = report.photos?.[0]?.imageUrl;
  const place = report.location
    ? `${report.location.city}, ${report.location.state}`
    : null;

  return (
    <li className={`my-report-card my-report-card--${tone}`}>
      <div className="my-report-card__body">
        <div className="my-report-card__photo">
          <div className="my-report-card__frame">
            {photo ? <img src={photo} alt="" /> : <Icon name="pets" />}
          </div>
          <span
            className={`my-report-card__dot${report.status === 'ACTIVE' ? ' my-report-card__dot--live' : ''}`}
            aria-hidden="true"
          />
        </div>

        <div className="my-report-card__info">
          <div className="my-report-card__heading">
            <h3
              ref={headingRef}
              tabIndex={-1}
              className="my-report-card__title"
            >
              {title}
            </h3>
            <span className="my-report-card__details">
              {details.map((detail) => `• ${detail}`).join(' ')}
            </span>
            <span className="my-report-card__badge">
              {reunited ? (
                <Icon name="done_all" />
              ) : (
                <span
                  className="my-report-card__badge-dot"
                  aria-hidden="true"
                />
              )}
              {label}
            </span>
          </div>
          <div className="my-report-card__meta">
            <span className="my-report-card__date">
              <Icon name={reunited ? 'event_available' : 'schedule'} />
              {lost ? 'Lost on' : 'Found on'}{' '}
              <time dateTime={report.eventDate.slice(0, 10)}>
                {formatDate(report.eventDate)}
              </time>
            </span>
            {place && (
              <span className="my-report-card__place">
                <Icon name="near_me" />
                {place}
              </span>
            )}
          </div>
          {reunited && (
            <span className="my-report-card__note">
              <Icon name="celebration" />
              Reunited with family
            </span>
          )}
        </div>
      </div>

      <div className="my-report-card__actions">
        <Link
          to={PATHS.petDetails(String(report.petReportId))}
          className="my-report-card__view"
          aria-label={`View report for ${title}`}
        >
          <Icon name="visibility" />
          View report
        </Link>
        <MarkReunitedButton report={report} onReunited={handleReunited} />
      </div>
    </li>
  );
}

export function MyReportsList() {
  const query = useMyReports();
  const [toast, setToast] = useState<string | null>(null);
  const showReunitedToast = useCallback(
    () => setToast('🎉 Case updated to Reunited! Recovery rate incremented.'),
    [],
  );
  const hideToast = useCallback(() => setToast(null), []);
  const total = query.data?.total;

  return (
    <section aria-labelledby="my-reports-title">
      <div className="my-reports-header">
        <div className="my-reports-header__text">
          <div>
            <h2 id="my-reports-title" className="my-reports-header__title">
              My Active &amp; Historical Incident Reports
            </h2>
            <p className="my-reports-header__subtitle">
              Live monitoring stream for community-dispatched animal recovery
              nodes
            </p>
          </div>
          {total !== undefined && (
            <span className="my-reports-header__total">
              {total} total {total === 1 ? 'report' : 'reports'}
            </span>
          )}
        </div>
        <Link to={PATHS.reportPet} className="my-reports-header__new">
          <Icon name="emergency_share" />+ File New Report
        </Link>
      </div>

      <QueryView query={query} loading="Loading your reports…">
        {({ reports }) =>
          reports.length === 0 ? (
            <p className="my-reports-empty">
              You haven't reported any pets yet.
            </p>
          ) : (
            <ul className="my-reports-list">
              {reports.map((report) => (
                <MyReportCard
                  key={report.petReportId}
                  report={report}
                  onReunited={showReunitedToast}
                />
              ))}
            </ul>
          )
        }
      </QueryView>
      <Toast message={toast} onDismiss={hideToast} />
    </section>
  );
}
