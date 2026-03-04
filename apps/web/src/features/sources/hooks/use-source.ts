import {
  useSuspenseQuery,
  useQuery,
  type UseSuspenseQueryResult,
  type UseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type Source = RouterOutput['sources']['get'];
type SourceContent = RouterOutput['sources']['getContent'];

/**
 * Fetch a single source by ID with Suspense.
 * Use this when the source is required to render.
 */
export function useSource(id: string): UseSuspenseQueryResult<Source, Error> {
  return useSuspenseQuery(
    apiClient.sources.get.queryOptions({ input: { id } }),
  );
}

/**
 * Get the query key for a source.
 * Useful for cache operations.
 */
export function getSourceQueryKey(sourceId: string): QueryKey {
  return apiClient.sources.get.queryOptions({ input: { id: sourceId } })
    .queryKey;
}

/**
 * Fetch source text content by ID (non-suspense).
 * Use this when content may not be available yet (e.g. processing/failed sources).
 */
export function useSourceContentOptional(
  id: string,
  enabled: boolean,
): UseQueryResult<SourceContent, Error> {
  return useQuery({
    ...apiClient.sources.getContent.queryOptions({ input: { id } }),
    enabled,
  });
}
