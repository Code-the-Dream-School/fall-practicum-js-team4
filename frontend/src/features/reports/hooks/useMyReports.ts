import { useQuery } from '@tanstack/react-query';
import { getMyReports } from '../../../services/reportApi';

export const myReportsKey = ['reports', 'mine'] as const;

export const useMyReports = () =>
  useQuery({ queryKey: myReportsKey, queryFn: getMyReports });
