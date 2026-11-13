import { apiRequest } from './api';
import type { ReportDetails } from '../types/reports';

export const getReportDetails = (id: string) =>
  apiRequest<ReportDetails>(`/api/reports/${encodeURIComponent(id)}/public`);

export const isReportOwnedByCurrentUser = async (
  reportId: number,
): Promise<boolean> => {
  const { reports } = await apiRequest<{
    reports: { petReportId: number }[];
  }>('/api/reports/mine');

  return reports.some((report) => report.petReportId === reportId);
};