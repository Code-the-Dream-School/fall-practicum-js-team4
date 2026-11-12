import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getReports } from '../../../services/reportApi';
import type { ReportListParams } from '../../../types/reports';

export const reportKeys = {
  all: ['reports'] as const,
  list: (params: ReportListParams) =>
    [...reportKeys.all, 'list', params] as const,
};

export const useReports = (params: ReportListParams) =>
  useQuery({
    queryKey: reportKeys.list(params),
    queryFn: () => getReports(params),
    // While a new search loads, keep the previous results on screen instead
    // of flashing "Loading…" on every keystroke
    placeholderData: keepPreviousData,
  });
