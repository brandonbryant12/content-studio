import {
  useQuery,
  useInfiniteQuery,
  type UseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient, rawApiClient } from '@/clients/apiClient';

type ActivityList = RouterOutput['admin']['list'];

interface UseActivityListOptions {
  userId?: string;
  entityType?: string;
  action?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Fetch paginated activity list with cursor-based pagination.
 */
export function useActivityList(options: UseActivityListOptions = {}) {
  const { userId, entityType, action, limit = 50, enabled = true } = options;

  return useInfiniteQuery({
    queryKey: ['admin', 'activity', 'list', { userId, entityType, action }],
    queryFn: async ({ pageParam }) => {
      return rawApiClient.admin.list({
        userId,
        entityType,
        action,
        limit,
        afterCursor: pageParam ?? undefined,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled,
  });
}

/**
 * Simple non-paginated activity list (first page only).
 * Useful for route loaders.
 */
export function useActivityListSimple(
  options: UseActivityListOptions = {},
): UseQueryResult<ActivityList, Error> {
  const { userId, entityType, action, limit, enabled = true } = options;

  return useQuery({
    ...apiClient.admin.list.queryOptions({
      input: { userId, entityType, action, limit },
    }),
    enabled,
  });
}

/**
 * Get the query key for activity list.
 * Useful for cache invalidation from SSE.
 */
export function getActivityListQueryKey(
  options: { userId?: string; entityType?: string; action?: string } = {},
): QueryKey {
  return apiClient.admin.list.queryOptions({
    input: {
      userId: options.userId,
      entityType: options.entityType,
      action: options.action,
    },
  }).queryKey;
}
