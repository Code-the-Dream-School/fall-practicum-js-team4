import { apiRequest } from './api';
import type { PetReport, UpdateReportInput } from '../types/reports';

export const getReportById = (id: string) =>
  apiRequest<PetReport>(`/api/reports/${encodeURIComponent(id)}`);

export const updateReport = (id: string, input: UpdateReportInput) =>
  apiRequest<PetReport>(`/api/reports/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input,
  });
