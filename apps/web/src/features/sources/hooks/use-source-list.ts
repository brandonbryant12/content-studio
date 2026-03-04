import {
  useQuery,
  type UseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type SourceList = RouterOutput['sources']['list'];

interface UseSourceListOptions {
  limit?: number;
  enabled?: boolean;
}

/**
 * Fetch source list with options.
 * Use this for conditional fetching or optional data.
 */
export function useSourceList(
  options: UseSourceListOptions = {},
): UseQueryResult<SourceList, Error> {
  const { limit, enabled = true } = options;

  return useQuery({
    ...apiClient.sources.list.queryOptions({ input: { limit } }),
    enabled,
  });
}

export const useSources = useSourceList;

/**
 * Get the query key for source list.
 * Useful for cache operations.
 */
export function getSourceListQueryKey(
  options: { limit?: number } = {},
): QueryKey {
  return apiClient.sources.list.queryOptions({
    input: { limit: options.limit },
  }).queryKey;
}

/**
 * Fetch source list with ordering and limit.
 * Use this for displaying ordered source lists with optional limits.
 */
export function useSourcesOrdered(
  options: { limit?: number; orderBy?: 'asc' | 'desc'; enabled?: boolean } = {},
): UseQueryResult<SourceList, Error> {
  const { limit, orderBy = 'desc', enabled = true } = options;

  return useQuery({
    ...apiClient.sources.list.queryOptions({ input: { limit } }),
    enabled,
    select: (data) => {
      // ISO 8601 dates are lexicographically sortable - no Date objects needed
      const sorted = [...data].sort((a, b) =>
        orderBy === 'desc'
          ? b.createdAt.localeCompare(a.createdAt)
          : a.createdAt.localeCompare(b.createdAt),
      );
      return limit ? sorted.slice(0, limit) : sorted;
    },
  });
}
