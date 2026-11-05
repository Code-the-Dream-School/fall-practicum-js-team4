import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { textStyles } from '../styles/theme';
import { getReportById, updateReport } from '../services/reportApi';
import type { PetReport, UpdateReportInput } from '../types/reports';
import { useAuth } from '../context/useAuth';
import { ApiError } from '../services/api';
import {
  ReportForm,
  type ReportFormValues,
} from '../features/reports/components/ReportForm';
import './ReportPetPage.css';

export function UpdateReportPage() {
  const { id } = useParams<{ id: string }>();
  const { user, status } = useAuth();
  const [report, setReport] = useState<PetReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');

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

        const data = await getReportById(reportId);

        if (cancelled) return;

        if (data.userId !== currentUserId) {
          setError('You do not have permission to edit this report.');
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

            case 'UNATHORIZED':
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

  async function handleUpdate(values: ReportFormValues, photos: File[] = []) {
    if (!id || !report || !user || report.userId !== user.id) {
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
      setSuccess('');

      const updatedReport = await updateReport(id, input, { photos });
      setReport(updatedReport);
      setSuccess('Report updated successfully.');
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
          onSubmit={handleUpdate}
          isSaving={isSaving}
        />
        {error && <p role="alert">{error}</p>}
        {success && <p role="status">{success}</p>}
      </div>
    </div>
  );
}
