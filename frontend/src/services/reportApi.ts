import { ApiError, apiRequest } from './api';
import type { CreateReportInput, PetReport } from '../types/reports';

export interface CreateReportOptions {
  photos?: File[];
}

/**
 * Creates a new pet report.
 * If photos are provided, builds a multipart/form-data payload containing
 * a 'report' JSON string field and multiple 'photos' file fields as required by the backend.
 * Otherwise, sends standard JSON.
 */
export async function createReport(
  reportData: CreateReportInput,
  options: CreateReportOptions = {},
): Promise<PetReport> {
  const { photos = [] } = options;

  if (photos.length > 0) {
    const formData = new FormData();
    formData.append('report', JSON.stringify(reportData));
    photos.forEach((photo) => {
      formData.append('photos', photo);
    });

    return apiRequest<PetReport>('/api/reports', {
      method: 'POST',
      body: formData,
    });
  }

  return apiRequest<PetReport>('/api/reports', {
    method: 'POST',
    body: reportData,
  });
}

/**
 * Maps backend errors from POST /api/reports into user-friendly messages,
 * including specific photo upload errors (502 PHOTO_UPLOAD_FAILED, 400 photos validation).
 */
export function describeReportError(err: unknown): string {
  if (!(err instanceof ApiError)) {
    return 'Something went wrong. Please try again.';
  }

  switch (err.code) {
    case 'PHOTO_UPLOAD_FAILED':
      return 'Could not upload photos to storage. Please try again.';
    case 'REPORT_LIMIT_REACHED':
      return 'You have reached the maximum of 100 reports.';
    case 'TOO_MANY_REQUESTS':
      return 'Too many reports submitted recently. Please wait a few minutes and try again.';
    case 'VALIDATION_ERROR': {
      const photoError = err.details.find(
        (d) => d.field === 'photos' || d.field.startsWith('photos.'),
      );
      if (photoError) {
        return photoError.message;
      }
      return 'Please check the report details and try again.';
    }
    case 'NETWORK_ERROR':
      return err.message;
    default:
      return 'Something went wrong on our side. Please try again in a moment.';
  }
}
