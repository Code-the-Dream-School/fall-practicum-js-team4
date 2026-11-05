import { useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  ReportForm,
  type ReportFormValues,
} from '../features/reports/components/ReportForm';
import { createReport, describeReportError } from '../services/reportApi';
import type { CreateReportInput, ReportType } from '../types/reports';
import { textStyles } from '../styles/theme';
import './ReportPetPage.css';

export function ReportPetPage() {
  const [params] = useSearchParams();
  const reportType: ReportType =
    params.get('type') === 'found' ? 'FOUND' : 'LOST';

  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  const handleCreate = async (values: ReportFormValues, photos: File[]) => {
    const payload: CreateReportInput = {
      reportType,
      petType: values.petType,
      petName: values.petName.trim() || undefined,
      breed: values.breed?.trim() || undefined,
      color: values.color.trim(),
      size: values.size,
      gender: values.gender,
      distinctiveFeatures: values.distinctiveFeatures?.trim() || undefined,
      eventDate: new Date(`${values.eventDate}T00:00:00Z`).toISOString(),
      contactInfo: values.contactInfo?.trim() || undefined,
      ...(values.zipCode.trim() || values.city.trim() || values.state.trim()
        ? {
            location: {
              zipCode: values.zipCode.trim(),
              city: values.city.trim(),
              state: values.state.trim().toUpperCase(),
            },
          }
        : {}),
    };

    setSubmissionError(null);
    setSubmissionSuccess(false);

    try {
      await createReport(payload, { photos });

      setSubmissionSuccess(true);
    } catch (error) {
      setSubmissionError(describeReportError(error));
    }
  };

  return (
    <div className="report-pet-page">
      <section className="report-pet-page__card">
        <h1 style={textStyles.pageTitle}>Report a Pet: {reportType}</h1>
        <ReportForm
          key={reportType}
          reportType={reportType}
          onSubmit={handleCreate}
          isSaving={submissionSuccess}
        />
        {submissionError && <p role="alert">{submissionError}</p>}

        {submissionSuccess && (
          <p role="status">Your pet report was submitted successfully!</p>
        )}
      </section>
    </div>
  );
}
