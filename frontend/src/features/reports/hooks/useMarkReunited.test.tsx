import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { createQueryClient } from '../../../app/queryClient';
import { API, server, testUser } from '../../../test/server';
import type { MyReports } from '../../../services/reportApi';
import type { PetReport } from '../../../types/reports';
import { useMarkReunited } from './useMarkReunited';
import { myReportsKey } from './useMyReports';

const milo = {
  petReportId: 1,
  userId: testUser.id,
  reportType: 'LOST',
  status: 'ACTIVE',
  petName: 'Milo',
} as PetReport;

describe('useMarkReunited', () => {
  it('updates "my reports" in place and refreshes only the other report lists', async () => {
    server.use(
      http.patch(`${API}/api/reports/:id`, () =>
        HttpResponse.json({
          success: true,
          data: { ...milo, status: 'REUNITED' },
        }),
      ),
    );
    const client = createQueryClient({
      onSessionExpired: () => {},
      retryDelay: 0,
    });
    const publicListKey = ['reports', 'list'];
    client.setQueryData<MyReports>(myReportsKey, { total: 1, reports: [milo] });
    client.setQueryData(publicListKey, { reports: [milo] });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useMarkReunited(), { wrapper });
    result.current.mutate(milo.petReportId);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(
      client.getQueryData<MyReports>(myReportsKey)?.reports[0].status,
    ).toBe('REUNITED');
    // Already correct: no second request for it
    expect(client.getQueryState(myReportsKey)?.isInvalidated).toBe(false);
    // Other lists still show the report as lost: they reload
    expect(client.getQueryState(publicListKey)?.isInvalidated).toBe(true);
  });
});
