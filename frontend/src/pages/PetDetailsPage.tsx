import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { PATHS } from '../app/paths';
import { ApiError } from '../services/api';
import { getReportDetails } from '../services/reportApi';
import type { ReportDetails } from '../types/reports';
import './PetDetailsPage.css';

// Temporary sample for local preview. Remove before the PR.

const demoReport: ReportDetails = {
  petReportId: 1,
  reportType: 'LOST',
  status: 'ACTIVE',
  petType: 'DOG',
  petName: 'Milo',
  breed: 'Mixed breed',
  color: 'Brown and white',
  size: 'MEDIUM',
  gender: 'MALE',
  distinctiveFeatures: 'White patch on chest and blue collar.',
  eventDate: '2026-11-02',
  location: {
    zipCode: '23220',
    city: 'Richmond',
    state: 'VA',
  },
  photos: [],
};

function ReportContent({
  report,
  preview = false,
}: {
  report: ReportDetails;
  preview?: boolean;
}) {
  const isLost = report.reportType === 'LOST';
  const petName = report.petName || `${report.petType} Report`;

  const location = report.location
    ? `${report.location.city}, ${report.location.state} ${report.location.zipCode}`
    : 'Not provided';

  return (
    <article className="pet-details-page">
      <Link
        to={isLost ? PATHS.lostPets : PATHS.foundPets}
        className="pet-details__back"
      >
        ← Back to {isLost ? 'Lost' : 'Found'} Pets
      </Link>

      {preview && (
        <p className="pet-details__preview">
          Sample preview - not a real pet report.
        </p>
      )}

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
              <dd>{report.petType}</dd>
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
              <dd>{report.size}</dd>
            </div>
            <div>
              <dt>Gender</dt>
              <dd>{report.gender}</dd>
            </div>
            <div>
              <dt>Date Lost/Found</dt>
              <dd>{report.eventDate.slice(0, 10)}</dd>
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

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; report: ReportDetails }
  | { status: 'missing' }
  | { status: 'error' };

function ReportLoader({ id }: { id: string }) {
  const [state, setState] = useState<LoadState>({
    status: 'loading',
  });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;

    getReportDetails(id)
      .then((report) => {
        if (active) {
          setState({ status: 'ready', report });
        }
      })
      .catch((error: unknown) => {
        if (!active) return;

        setState({
          status:
            error instanceof ApiError && error.status === 404
              ? 'missing'
              : 'error',
        });
      });

    return () => {
      active = false;
    };
  }, [id, retry]);

  if (state.status === 'loading') {
    return (
      <p className="pet-details-page" role="status">
        Loading pet report...
      </p>
    );
  }

  if (state.status === 'ready') {
    return <ReportContent report={state.report} />;
  }

  return (
    <section className="pet-details-page">
      <h1>
        {state.status === 'missing'
          ? 'Report not found'
          : 'Unable to load report'}
      </h1>

      <p role="alert">
        {state.status === 'missing'
          ? 'This pet report could not be found.'
          : 'Something went wrong while loading this report.'}
      </p>

      {state.status === 'error' && (
        <button
          type="button"
          onClick={() => {
            setState({ status: 'loading' });
            setRetry((count) => count + 1);
          }}
        >
          Try again
        </button>
      )}

      <p>
        <Link to={PATHS.home}>Return home</Link>
      </p>
    </section>
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

  // Local preview only; normal report  IDs use the API.
  if (import.meta.env.DEV && id === 'demo-1') {
    return <ReportContent report={demoReport} preview />;
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
