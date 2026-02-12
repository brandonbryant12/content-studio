import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/clients/apiClient';
import type { ActivityStats, Period } from '../types';

/**
 * Fetch activity stats with period filter.
 */
export function useActivityStats(
  period: Period = '7d',
): UseQueryResult<ActivityStats, Error> {
  return useQuery(apiClient.admin.stats.queryOptions({ input: { period } }));
}
