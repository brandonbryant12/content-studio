// features/documents/hooks/use-document-list.ts

import {
  useQuery,
  useSuspenseQuery,
  type UseQueryResult,
  type UseSuspenseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type DocumentList = RouterOutput['documents']['list'];

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
    ...apiClient.documents.list.queryOptions({ input: { limit } }),
    enabled,
  });
}

/**
 * Fetch document list with Suspense.
 * Use this when the list is required to render.
 */
export function useSuspenseDocumentList(
  options: { limit?: number } = {},
): UseSuspenseQueryResult<DocumentList, Error> {
  const { limit } = options;

  return useSuspenseQuery(
    apiClient.documents.list.queryOptions({ input: { limit } }),
  );
}

/**
 * Get the query key for document list.
 * Useful for cache operations.
 */
export function getDocumentListQueryKey(
  options: { limit?: number } = {},
): QueryKey {
  return apiClient.documents.list.queryOptions({ input: { limit: options.limit } })
    .queryKey;
}
