import {
  useInfiniteQuery,
  type InfiniteData,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient, rawApiClient } from '@/clients/apiClient';

type ActivityListPage = RouterOutput['admin']['list'];

export const DEFAULT_ACTIVITY_LIST_LIMIT = 25;

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
  const { userId, entityType, search, limit = DEFAULT_ACTIVITY_LIST_LIMIT } =
    options;

  return apiClient.admin.list.queryOptions({
    input: {
      userId,
      entityType,
      search: normalizeSearch(search),
      limit,
    },
  }).queryKey;
}

export function getActivityListInfiniteQueryOptions(
  options: ActivityListQueryKeyOptions = {},
) {
  const { userId, entityType, search, limit = DEFAULT_ACTIVITY_LIST_LIMIT } =
    options;
  const normalizedSearch = normalizeSearch(search);

  return {
    queryKey: getActivityListQueryKey({
      userId,
      entityType,
      search: normalizedSearch,
      limit,
    }),
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) =>
      rawApiClient.admin.list({
        userId,
        entityType,
        search: normalizedSearch,
        limit,
        afterCursor: pageParam,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage: ActivityListPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
  };
}

/**
 * Fetch paginated activity list with cursor-based pagination.
 */
export function useActivityList(options: UseActivityListOptions = {}) {
  const {
    userId,
    entityType,
    search,
    limit = DEFAULT_ACTIVITY_LIST_LIMIT,
    enabled = true,
  } = options;
  const queryOptions = getActivityListInfiniteQueryOptions({
    userId,
    entityType,
    search,
    limit,
  });

  return useInfiniteQuery<
    ActivityListPage,
    Error,
    InfiniteData<ActivityListPage, string | undefined>,
    QueryKey,
    string | undefined
  >({
    ...queryOptions,
    enabled,
  });
}
