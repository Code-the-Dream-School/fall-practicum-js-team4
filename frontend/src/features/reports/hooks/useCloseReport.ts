import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../../services/api';
import { closeReport, type MyReports } from '../../../services/reportApi';
import type { CloseReason, PetReport } from '../../../types/reports';
import { myReportsKey } from './useMyReports';

export const canCloseReport = (report: PetReport) => report.status === 'ACTIVE';

export function useCloseReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: CloseReason }) =>
      closeReport(id, reason),
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
      // Invalidate global lists so they update
      void queryClient.invalidateQueries({
        queryKey: ['reports'],
        predicate: (query) => query.queryKey[1] !== myReportsKey[1],
      });
    },
    onError: (err) => {
      // If the report was closed in another session/tab, refresh to stay in sync
      if (err instanceof ApiError && err.code === 'REPORT_CLOSED') {
        void queryClient.invalidateQueries({ queryKey: myReportsKey });
      }
    },
  });
}
