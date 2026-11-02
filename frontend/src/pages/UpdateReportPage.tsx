import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { textStyles } from '../styles/theme';
import { getReportById, updateReport } from '../services/reportApi';
import type { PetReport, UpdateReportInput } from '../types/reports';
import {
  ReportForm,
  type ReportFormValues,
} from '../features/reports/components/ReportForm';

export function UpdateReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<PetReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    async function loadReport(reportId: string) {
      try {
        setLoading(true);
        setError(null);
        setReport(null);

        const data = await getReportById(reportId);

        if (!cancelled) {
          setReport(data);
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load the report. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void loadReport(id);

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleUpdate(values: ReportFormValues) {
    if (!id) {
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

      const updatedReport = await updateReport(id, input);
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
  if (loading) {
    return <p>Loading report...</p>;
  }
  if (error && !report) {
    return <p role="alert">{error}</p>;
  }
  if (!report) {
    return <p>Report not found.</p>;
  }

  return (
    <div>
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
  );
}
