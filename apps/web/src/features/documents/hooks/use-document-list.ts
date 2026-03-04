import {
  useQuery,
  type UseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type DocumentList = RouterOutput['sources']['list'];

interface UseDocumentListOptions {
  limit?: number;
  enabled?: boolean;
}

/**
 * Fetch document list with options.
 * Use this for conditional fetching or optional data.
 */
export function useDocumentList(
  options: UseDocumentListOptions = {},
): UseQueryResult<DocumentList, Error> {
  const { limit, enabled = true } = options;

  return useQuery({
    ...apiClient.sources.list.queryOptions({ input: { limit } }),
    enabled,
  });
}

export const useDocuments = useDocumentList;

/**
 * Get the query key for document list.
 * Useful for cache operations.
 */
export function getDocumentListQueryKey(
  options: { limit?: number } = {},
): QueryKey {
  return apiClient.sources.list.queryOptions({
    input: { limit: options.limit },
  }).queryKey;
}

/**
 * Fetch document list with ordering and limit.
 * Use this for displaying ordered document lists with optional limits.
 */
export function useDocumentsOrdered(
  options: { limit?: number; orderBy?: 'asc' | 'desc'; enabled?: boolean } = {},
): UseQueryResult<DocumentList, Error> {
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
