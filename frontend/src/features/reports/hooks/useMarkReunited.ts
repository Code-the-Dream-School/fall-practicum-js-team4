import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  markReportReunited,
  type MyReports,
} from '../../../services/reportApi';
import type { PetReport } from '../../../types/reports';
import { myReportsKey } from './useMyReports';

// Only the owner of a lost pet can say it's back home (found reports are
// closed some other way)
export const canMarkReunited = (report: PetReport) =>
  report.reportType === 'LOST' && report.status === 'ACTIVE';

export function useMarkReunited() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markReportReunited,
    onSuccess: (updated) => {
      // Show the new status right away, without waiting for a refetch
      queryClient.setQueryData<MyReports>(myReportsKey, (old) =>
        old
          ? {
              ...old,
              reports: old.reports.map((report) =>
                report.petReportId === updated.petReportId ? updated : report,
              ),
            }
          : old,
      );
      // Lists and details elsewhere still show the report as lost. "Mine" is
      // already up to date from the line above: refetching it is a wasted request
      void queryClient.invalidateQueries({
        queryKey: ['reports'],
        predicate: (query) => query.queryKey[1] !== myReportsKey[1],
      });
    },
  });
}
