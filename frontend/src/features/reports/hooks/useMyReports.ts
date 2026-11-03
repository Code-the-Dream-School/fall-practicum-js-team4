import { useQuery } from '@tanstack/react-query';
import { getMyReports } from '../../../services/reportApi';

export function useMyReports() {
    return useQuery({
        queryKey: ['myReports'],
        queryFn: getMyReports,
    });
}