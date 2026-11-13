import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { textStyles } from '../styles/theme';
import { getReportById, updateReport } from '../services/reportApi';
import type { PetReport, UpdateReportInput } from '../types/reports';
import { useAuth } from '../context/useAuth';
import { ApiError } from '../services/api';
import { PATHS } from '../app/paths';
import { Icon } from '../components/Icon';
import {
  ReportForm,
  type ReportFormValues,
} from '../features/reports/components/ReportForm';
import './ReportPetPage.css';

const MAX_PHOTOS = 5;

export function UpdateReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, status } = useAuth();
  const [report, setReport] = useState<PetReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletePhotoIds, setDeletePhotoIds] = useState<number[]>([]);
  const remainingPhotoCount = (report?.photos ?? []).filter(
    (photo) => !deletePhotoIds.includes(photo.petPhotoId),
  ).length;
  const availablePhotoSlots = MAX_PHOTOS - remainingPhotoCount;

  useEffect(() => {
    if (status === 'loading') return;

    if (status !== 'authenticated' || !user) {
      setReport(null);
      setError('Please sign in to edit this report.');
      setLoading(false);
      return;
    }

    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function loadReport(reportId: string, currentUserId: string) {
      try {
        setLoading(true);
        setError(null);
        setReport(null);
        setDeletePhotoIds([]);

        const data = await getReportById(reportId);

        if (cancelled) return;

        if (data.userId !== currentUserId) {
          setError("You don't have permission to edit this report.");
          return;
        }
        setReport(data);
      } catch (err: unknown) {
        if (cancelled) return;

        if (err instanceof ApiError) {
          switch (err.code) {
            case 'FORBIDDEN':
              setError("You don't have permission to edit this report.");
              break;
            case 'NOT_FOUND':
              setError('Report not found.');
              break;
            case 'UNAUTHORIZED':
              setError('Please sign in to edit this report.');
              break;
            case 'NETWORK_ERROR':
              setError(err.message);
              break;
            default:
              setError('Unable to load the report. Please try again.');
          }
        } else {
          setError('Unable to load the report. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void loadReport(id, user.id);

    return () => {
      cancelled = true;
    };
  }, [id, user, status]);

  function handleRemovePhoto(photoId: number) {
    setDeletePhotoIds((prev) =>
      prev.includes(photoId) ? prev : [...prev, photoId],
    );
  }

  async function handleUpdate(values: ReportFormValues, photos: File[]) {
    if (!id || !report || !user || report.userId !== user.id) {
      return;
    }

    if (remainingPhotoCount + photos.length > MAX_PHOTOS) {
      setError('You can have a maximum of 5 photos per report.');
      return;
    }

    const input: UpdateReportInput = {
      petType: values.petType,
      petName: values.petName?.trim() || null,
      breed: values.breed?.trim() || null,
      color: values.color.trim(),
      size: values.size,
      gender: values.gender,
      distinctiveFeatures: values.distinctiveFeatures?.trim() || null,
      eventDate: new Date(`${values.eventDate}T00:00:00Z`).toISOString(),
      contactInfo: values.contactInfo?.trim() || null,
      status: report.status,
      deletePhotoIds,
      location:
        values.zipCode?.trim() || values.city?.trim() || values.state?.trim()
          ? {
              zipCode: values.zipCode.trim(),
              city: values.city.trim(),
              state: values.state.trim().toUpperCase(),
            }
          : null,
    };

    try {
      setIsSaving(true);
      setError(null);

      await updateReport(id, input, { photos });

      navigate(PATHS.petDetails(id), {
        replace: true,
        state: { successMessage: 'Report updated successfully.' },
      });
    } catch {
      setError('Unable to update the report. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!id) {
    return <p role="alert">Report ID is missing.</p>;
  }
  if (status === 'loading' || loading) {
    return <p>Loading report...</p>;
  }
  if (error && !report) {
    return <p role="alert">{error}</p>;
  }
  if (!report) {
    return <p>Report not found.</p>;
  }

  return (
    <div className="report-pet-page">
      <div className="report-pet-page__card">
        <h1 style={textStyles.pageTitle}>Update Pet Report</h1>
        <p>Report ID: {report.petReportId}</p>
        {report.photos && report.photos.length > 0 && (
          <section aria-label="Existing photos">
            <div className="existing-photos">
              {report.photos
                .filter((photo) => !deletePhotoIds.includes(photo.petPhotoId))
                .map((photo) => (
                  <div key={photo.petPhotoId} className="existing-photo">
                    <img
                      src={photo.imageUrl}
                      alt={`Pet photo ${photo.petPhotoId}`}
                      className="existing-photo__image"
                    />
                    <button
                      type="button"
                      className="photo-upload__remove"
                      onClick={() => handleRemovePhoto(photo.petPhotoId)}
                      disabled={isSaving}
                      aria-label={`Remove photo ${photo.petPhotoId}`}
                      title="Remove photo"
                    >
                      <Icon name="delete" />
                    </button>
                  </div>
                ))}
            </div>
          </section>
        )}
        <ReportForm
          reportType={report.reportType}
          initialValues={{
            petName: report.petName ?? '',
            breed: report.breed ?? '',
            petType: report.petType,
            color: report.color,
            size: report.size,
            gender: report.gender,
            distinctiveFeatures: report.distinctiveFeatures ?? '',
            eventDate: report.eventDate.slice(0, 10),
            contactInfo: report.contactInfo ?? '',
            zipCode: report.location?.zipCode ?? '',
            city: report.location?.city ?? '',
            state: report.location?.state ?? '',
          }}
          maxPhotos={availablePhotoSlots}
          onSubmit={handleUpdate}
          isSaving={isSaving}
          submitLabel="Save Changes"
          showPhotoUpload={true}
        />
        {error && <p role="alert">{error}</p>}
      </div>
    </div>
  );
}
