import {
  useSuspenseQuery,
  useQuery,
  type UseSuspenseQueryResult,
  type UseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type Document = RouterOutput['sources']['get'];
type DocumentContent = RouterOutput['sources']['getContent'];

/**
 * Fetch a single document by ID with Suspense.
 * Use this when the document is required to render.
 */
export function useDocument(
  id: string,
): UseSuspenseQueryResult<Document, Error> {
  return useSuspenseQuery(
    apiClient.sources.get.queryOptions({ input: { id } }),
  );
}

/**
 * Get the query key for a document.
 * Useful for cache operations.
 */
export function getDocumentQueryKey(documentId: string): QueryKey {
  return apiClient.sources.get.queryOptions({ input: { id: documentId } })
    .queryKey;
}

/**
 * Fetch document text content by ID (non-suspense).
 * Use this when content may not be available yet (e.g. processing/failed documents).
 */
export function useDocumentContentOptional(
  id: string,
  enabled: boolean,
): UseQueryResult<DocumentContent, Error> {
  return useQuery({
    ...apiClient.sources.getContent.queryOptions({ input: { id } }),
    enabled,
  });
}
