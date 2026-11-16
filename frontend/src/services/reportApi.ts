import { ApiError, apiRequest } from './api';
import type {
  CreateReportInput,
  PetReport,
  UpdateReportInput,
  ReportListParams,
  ReportListResponse,
} from '../types/reports';
import { describeApiError, type ErrorKind } from './describeApiError';

export interface CreateReportOptions {
  photos?: File[];
}
export interface UpdateReportOptions {
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

export interface MyReports {
  total: number;
  reports: PetReport[];
}

// The signed-in user's reports, newest first
export const getMyReports = () => apiRequest<MyReports>('/api/reports/mine');

// The owner found their pet: closes the report
export const markReportReunited = (id: number) =>
  apiRequest<PetReport>(`/api/reports/${id}`, {
    method: 'PATCH',
    body: { status: 'REUNITED' },
  });

/**
 * Fetch and update an existing report
 */

export const getReportById = (id: string) =>
  apiRequest<PetReport>(`/api/reports/${encodeURIComponent(id)}`);

export const updateReport = (
  id: string,
  input: UpdateReportInput,
  options: UpdateReportOptions = {},
): Promise<PetReport> => {
  const { photos = [] } = options;
  const url = `/api/reports/${encodeURIComponent(id)}`;

  if (photos.length > 0) {
    const formData = new FormData();

    formData.append('report', JSON.stringify(input));

    photos.forEach((photo) => {
      formData.append('photos', photo);
    });

    return apiRequest<PetReport>(url, {
      method: 'PATCH',
      body: formData,
    });
  }

  return apiRequest<PetReport>(url, {
    method: 'PATCH',
    body: input,
  });
};

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
      return (
        err.message ||
        'Something went wrong on our side. Please try again in a moment.'
      );
  }
}

const reportListFrom = (data: ReportListResponse | null) => {
  if (!data || !Array.isArray(data.reports)) {
    throw new ApiError(
      500,
      'INTERNAL_ERROR',
      'Unexpected response from the server.',
    );
  }
  return data;
};

// Sends only the params that are set, so the URL stays short and cacheable
export async function getReports(
  params: ReportListParams,
): Promise<ReportListResponse> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, String(value));
  }
  return reportListFrom(
    await apiRequest<ReportListResponse | null>(`/api/reports?${query}`),
  );
}

// What failed when saving a report's status, by the team's error kinds
// (describeApiError). Its titles are written for loading data, so a failed
// save gets its own wording.
const SAVE_ERROR_TITLES: Record<ErrorKind, string> = {
  network: "You're offline",
  unauthenticated: 'Your session expired',
  forbidden: 'You can only update your own reports',
  'not-found': 'This report no longer exists',
  'rate-limited': 'Too many requests. Please wait a moment',
  server: 'Something went wrong on our side',
  client: "Couldn't save this change",
  unknown: 'Something went wrong',
};

/** Message for a failed "Mark Reunited": what happened, then that nothing changed. */
export const describeReunitedError = (err: unknown): string =>
  `${SAVE_ERROR_TITLES[describeApiError(err).kind]}. The report wasn't changed.`;
