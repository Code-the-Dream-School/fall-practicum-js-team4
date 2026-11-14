import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { ReportFilters } from '../../../types/reports';
import {
  filtersFromParams,
  pageFromParams,
  paramsFromFilters,
} from '../filters';

// The directory page's filters and page number, read from and written to the
// URL, so Back, reload and shared links keep both
export function useReportFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(
    () => filtersFromParams(searchParams),
    [searchParams],
  );
  const page = pageFromParams(searchParams);

  // A new filter starts again from page 1 (paramsFromFilters leaves page out).
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

  // Another page with the same filters; page 1 is left out of the URL.
  // Adds a history entry, so Back returns to the page before.
  const setPage = useCallback(
    (target: number) =>
      setSearchParams((current) => {
        const params = paramsFromFilters(filtersFromParams(current));
        if (target > 1) params.set('page', String(target));
        return params;
      }),
    [setSearchParams],
  );

  return { filters, page, updateFilters, clearFilters, setPage };
}
