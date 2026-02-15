import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { ActivityStats, Period } from '../types';
import { apiClient } from '@/clients/apiClient';

/**
 * Fetch activity stats with period filter.
 */
export function useActivityStats(
  period: Period = '7d',
): UseQueryResult<ActivityStats, Error> {
  return useQuery(apiClient.admin.stats.queryOptions({ input: { period } }));
}
