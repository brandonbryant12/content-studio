// features/podcasts/hooks/use-podcast-list.ts

import {
  useQuery,
  useSuspenseQuery,
  type UseQueryResult,
  type UseSuspenseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type PodcastList = RouterOutput['podcasts']['list'];

interface UsePodcastListOptions {
  limit?: number;
  enabled?: boolean;
}

/**
 * Fetch podcast list with options.
 * Use this for conditional fetching or optional data.
 */
export function usePodcastList(
  options: UsePodcastListOptions = {},
): UseQueryResult<PodcastList, Error> {
  const { limit, enabled = true } = options;

  return useQuery({
    ...apiClient.podcasts.list.queryOptions({ input: { limit } }),
    enabled,
  });
}

/**
 * Fetch podcast list with Suspense.
 * Use this when the list is required to render.
 */
export function useSuspensePodcastList(
  options: { limit?: number } = {},
): UseSuspenseQueryResult<PodcastList, Error> {
  const { limit } = options;

  return useSuspenseQuery(
    apiClient.podcasts.list.queryOptions({ input: { limit } }),
  );
}

/**
 * Get the query key for podcast list.
 * Useful for cache operations.
 */
export function getPodcastListQueryKey(
  options: { limit?: number } = {},
): QueryKey {
  return apiClient.podcasts.list.queryOptions({
    input: { limit: options.limit },
  }).queryKey;
}

/**
 * Fetch podcast list with ordering and limit.
 * Use this for displaying ordered podcast lists with optional limits.
 */
export function usePodcastsOrdered(
  options: { limit?: number; orderBy?: 'asc' | 'desc'; enabled?: boolean } = {},
): UseQueryResult<PodcastList, Error> {
  const { limit, orderBy = 'desc', enabled = true } = options;

  return useQuery({
    ...apiClient.podcasts.list.queryOptions({ input: { limit } }),
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
