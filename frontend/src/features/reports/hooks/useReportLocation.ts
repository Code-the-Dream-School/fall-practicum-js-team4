import { useQueries } from '@tanstack/react-query';
import { lookupZipCode } from '../../../services/locationApi';
import type { PublicReport } from '../../../types/reports';

export function useReportLocations(reports: PublicReport[]) {
  const zipCodes = [
    ...new Set(
      reports.flatMap((report) =>
        report.location?.zipCode ? [report.location.zipCode] : [],
      ),
    ),
  ];
  const queries = useQueries({
    queries: zipCodes.map((zipCode) => ({
      queryKey: ['locations', 'zip', zipCode],
      queryFn: () => lookupZipCode(zipCode),
      staleTime: 24 * 60 * 60 * 1000,
    })),
  });

  return {
    locations: queries.flatMap((query) => (query.data ? [query.data] : [])),
    isLoading: queries.some((query) => query.isPending),
    hasError: queries.some((query) => query.isError),
  };
}
