import { apiRequest } from './api';
import type { ReportDetails } from '../types/reports';

export const getReportDetails = (id: string) =>
  apiRequest<ReportDetails>(`/api/reports/${encodeURIComponent(id)}`);
