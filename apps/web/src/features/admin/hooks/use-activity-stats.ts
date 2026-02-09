import {
  useQuery,
  type UseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type ActivityStats = RouterOutput['admin']['stats'];
type Period = '24h' | '7d' | '30d';

/**
 * Fetch activity stats with period filter.
 */
export function useActivityStats(
  period: Period = '7d',
): UseQueryResult<ActivityStats, Error> {
  return useQuery(apiClient.admin.stats.queryOptions({ input: { period } }));
}

/**
 * Get the query key for activity stats.
 */
export function getActivityStatsQueryKey(period: Period = '7d'): QueryKey {
  return apiClient.admin.stats.queryOptions({ input: { period } }).queryKey;
}
