import type { RouterOutput } from '@repo/api/client';
import {
  useInfiniteQuery,
  type InfiniteData,
  type QueryKey,
} from '@tanstack/react-query';
import { apiClient, rawApiClient } from '@/clients/apiClient';

type ActivityListPage = RouterOutput['admin']['list'];

interface UseActivityListOptions {
  userId?: string;
  entityType?: string;
  search?: string;
  limit?: number;
  enabled?: boolean;
}

interface ActivityListQueryKeyOptions {
  userId?: string;
  entityType?: string;
  search?: string;
  limit?: number;
}

const normalizeSearch = (search?: string): string | undefined => {
  const normalizedSearch = search?.trim();
  return normalizedSearch && normalizedSearch.length > 0
    ? normalizedSearch
    : undefined;
};

export function getActivityListQueryKey(
  options: ActivityListQueryKeyOptions = {},
): QueryKey {
  const { userId, entityType, search, limit = 50 } = options;

  return apiClient.admin.list.queryOptions({
    input: {
      userId,
      entityType,
      search: normalizeSearch(search),
      limit,
    },
  }).queryKey;
}

/**
 * Fetch paginated activity list with cursor-based pagination.
 */
export function useActivityList(
  options: UseActivityListOptions = {},
) {
  const { userId, entityType, search, limit = 50, enabled = true } = options;
  const normalizedSearch = normalizeSearch(search);

  return useInfiniteQuery<
    ActivityListPage,
    Error,
    InfiniteData<ActivityListPage, string | undefined>,
    QueryKey,
    string | undefined
  >({
    queryKey: getActivityListQueryKey({
      userId,
      entityType,
      search: normalizedSearch,
      limit,
    }),
    queryFn: async ({ pageParam }) => {
      return rawApiClient.admin.list({
        userId,
        entityType,
        search: normalizedSearch,
        limit,
        afterCursor: pageParam,
      });
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled,
  });
}
