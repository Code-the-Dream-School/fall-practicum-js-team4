import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { ReportFilters } from '../../../types/reports';
import { filtersFromParams, paramsFromFilters } from '../filters';

// The directory page's filters, read from and written to the URL
export function useReportFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(
    () => filtersFromParams(searchParams),
    [searchParams],
  );

  // replace: changing a filter doesn't add a Back-button step for each one
  const updateFilters = useCallback(
    (changes: Partial<ReportFilters>) =>
      setSearchParams(
        (current) =>
          paramsFromFilters({ ...filtersFromParams(current), ...changes }),
        { replace: true },
      ),
    [setSearchParams],
  );

  const clearFilters = useCallback(
    () => setSearchParams(new URLSearchParams(), { replace: true }),
    [setSearchParams],
  );

  return { filters, updateFilters, clearFilters };
}
