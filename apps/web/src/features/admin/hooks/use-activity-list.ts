import { useInfiniteQuery } from '@tanstack/react-query';
import { rawApiClient } from '@/clients/apiClient';

interface UseActivityListOptions {
  userId?: string;
  entityType?: string;
  search?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Fetch paginated activity list with cursor-based pagination.
 */
export function useActivityList(options: UseActivityListOptions = {}) {
  const { userId, entityType, search, limit = 50, enabled = true } = options;

  return useInfiniteQuery({
    queryKey: ['admin', 'activity', 'list', { userId, entityType, search }],
    queryFn: async ({ pageParam }) => {
      return rawApiClient.admin.list({
        userId,
        entityType,
        search: search || undefined,
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
