import { useQuery } from '@tanstack/react-query';
import { QueryView } from '../components/QueryView';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { PATHS } from '../app/paths';
import {
  formatEventDate,
  PET_TYPE,
  SIZE,
  GENDER,
} from '../features/reports/format';
import { getReportDetailsForViewer } from '../services/reportApi';
import type { PublicReport } from '../types/reports';
import './PetDetailsPage.css';

function ReportContent({
  report,
  isOwner,
}: {
  report: PublicReport;
  isOwner: boolean;
}) {
  const isLost = report.reportType === 'LOST';

  const routeLocation = useLocation();
  const navigate = useNavigate();
  const { state } = routeLocation;

  const [successMessage] = useState<string | null>(() =>
    typeof state?.successMessage === 'string' ? state.successMessage : null,
  );

  useEffect(() => {
    if (typeof state?.successMessage !== 'string') return;

    const nextState = { ...state };
    delete nextState.successMessage;

    navigate(
      `${routeLocation.pathname}${routeLocation.search}${routeLocation.hash}`,
      { replace: true, state: nextState },
    );
  }, [
    state,
    navigate,
    routeLocation.pathname,
    routeLocation.search,
    routeLocation.hash,
  ]);
  // Remember the directory filters and page when returning
  const directoryPath = isLost ? PATHS.lostPets : PATHS.foundPets;
  const fromDirectory = state?.fromDirectory;

  const backToDirectory =
    typeof fromDirectory === 'string' &&
    (fromDirectory === directoryPath ||
      fromDirectory.startsWith(`${directoryPath}?`))
      ? fromDirectory
      : directoryPath;

  const petName = report.petName || `${report.petType} Report`;

  const location = report.location
    ? `${report.location.city}, ${report.location.state} ${report.location.zipCode}`
    : 'Not provided';

  return (
    <article className="pet-details-page">
      {successMessage && <p role="status">{successMessage}</p>}
      <Link to={backToDirectory} className="pet-details__back">
        ← Back to {isLost ? 'Lost' : 'Found'} Pets
      </Link>

      <header className="pet-details__header">
        <div>
          <p className="pet-details__eyebrow">
            {isLost ? 'Lost Pet Report' : 'Found Pet Report'}
          </p>
          <h1>{petName}</h1>
        </div>

        <span className="pet-details__status">
          {report.status === 'REUNITED' ? 'Reunited' : 'Active'}
        </span>

        {isOwner && (
          <Link
            to={PATHS.editReport(String(report.petReportId))}
            className="pet-details__edit"
          >
            Edit report
          </Link>
        )}
      </header>

      <div className="pet-details__layout">
        <section className="pet-details__card">
          <h2>Photos</h2>

          {report.photos.length === 0 ? (
            <div className="pet-details__photo-placeholder">
              no photos available
            </div>
          ) : (
            <div className="pet-details__photos">
              {report.photos.map((photo, index) => (
                <img
                  key={photo.petPhotoId}
                  src={photo.imageUrl}
                  alt={`Photo ${index + 1} of ${petName}`}
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </section>

        <section className="pet-details__card">
          <h2>Pet Information</h2>

          <dl className="pet-details__facts">
            <div>
              <dt>Pet Type</dt>
              <dd>{PET_TYPE[report.petType]}</dd>
            </div>
            <div>
              <dt>Breed</dt>
              <dd>{report.breed || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Color</dt>
              <dd>{report.color}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>{SIZE[report.size]}</dd>
            </div>
            <div>
              <dt>Gender</dt>
              <dd>{GENDER[report.gender] ?? 'Unknown'}</dd>
            </div>
            <div>
              <dt>Date Lost/Found</dt>
              <dd>{formatEventDate(report.eventDate)}</dd>
            </div>
            <div className="pet-details__full-width">
              <dt>Location</dt>
              <dd>{location}</dd>
            </div>
            <div className="pet-details__full-width">
              <dt>Distinctive Features</dt>
              <dd>{report.distinctiveFeatures || 'Not provided'}</dd>
            </div>
          </dl>
        </section>
      </div>
    </article>
  );
}

function ReportLoader({ id }: { id: string }) {
  const { status, user } = useAuth();

  const query = useQuery({
    queryKey: ['report-details', id, status, user?.id ?? null],
    enabled: status !== 'loading',
    queryFn: () => getReportDetailsForViewer(id, status === 'authenticated'),
  });

  return (
    <QueryView query={query} loading="Loading pet report...">
      {({ report, isOwner }) => (
        <ReportContent report={report} isOwner={isOwner} />
      )}
    </QueryView>
  );
}

export function PetDetailsPage() {
  const { id } = useParams();

  if (!id) {
    return (
      <p role="alert" className="pet-details-page">
        Invalid report link.
      </p>
    );
  }

  if (!/^[1-9]\d*$/.test(id)) {
    return (
      <p role="alert" className="pet-details-page">
        Invalid report link.
      </p>
    );
  }

  return <ReportLoader key={id} id={id} />;
}
