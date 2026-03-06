import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient, rawApiClient } from '@/clients/apiClient';

type ActivityListPage = RouterOutput['admin']['activity']['list'];

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
  return getActivityListQueryOptions(options).queryKey;
}

function getActivityListQueryOptions(
  options: ActivityListQueryKeyOptions = {},
) {
  const {
    userId,
    entityType,
    search,
    limit = DEFAULT_ACTIVITY_LIST_LIMIT,
  } = options;

  return apiClient.admin.activity.list.queryOptions({
    input: {
      userId,
      entityType,
      search: normalizeSearch(search),
      limit,
    },
  });
}

export function getActivityListInfiniteQueryOptions(
  options: ActivityListQueryKeyOptions = {},
) {
  const {
    userId,
    entityType,
    search,
    limit = DEFAULT_ACTIVITY_LIST_LIMIT,
  } = options;
  const normalizedSearch = normalizeSearch(search);

  return {
    queryKey: getActivityListQueryOptions({
      userId,
      entityType,
      search: normalizedSearch,
      limit,
    }).queryKey,
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) =>
      rawApiClient.admin.activity.list({
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

  return useInfiniteQuery({
    ...queryOptions,
    enabled,
  });
}
