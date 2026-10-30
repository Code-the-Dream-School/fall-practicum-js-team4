//   /pets/:id/edit
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { textStyles } from '../styles/theme';
import { getReportById } from '../services/reportApi';
import type { PetReport } from '../types/reports';

export function EditReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<PetReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (!id) {
    return <p role="alert">Report ID is missing.</p>;
  }
  if (loading) {
    return <p>Loading report...</p>;
  }
  if (error) {
    return <p role="alert">{error}</p>;
  }
  if (!report) {
    return <p>Report not found.</p>;
  }

  return (
    <div>
      <h1 style={textStyles.pageTitle}>Edit Pet Report</h1>
      <p>Report ID: {report.petReportId}</p>
      <p>Pet Name: {report.petName ?? 'Unknown'}</p>
      <p>Pet Type: {report.petType}</p>
      <p>Color: {report.color}</p>
    </div>
  );
}
