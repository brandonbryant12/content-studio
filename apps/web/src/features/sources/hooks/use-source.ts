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

interface SourceAccessOptions {
  userId?: string;
}

/**
 * Fetch a single source by ID with Suspense.
 * Use this when the source is required to render.
 */
export function useSource(
  id: string,
  options: SourceAccessOptions = {},
): UseSuspenseQueryResult<Source, Error> {
  return useSuspenseQuery(
    apiClient.sources.get.queryOptions({
      input: { id, userId: options.userId },
    }),
  );
}

/**
 * Get the query key for a source.
 * Useful for cache operations.
 */
export function getSourceQueryKey(
  sourceId: string,
  options: SourceAccessOptions = {},
): QueryKey {
  return apiClient.sources.get.queryOptions({
    input: { id: sourceId, userId: options.userId },
  }).queryKey;
}

/**
 * Fetch source text content by ID (non-suspense).
 * Use this when content may not be available yet (e.g. processing/failed sources).
 */
export function useSourceContentOptional(
  id: string,
  enabled: boolean,
  options: SourceAccessOptions = {},
): UseQueryResult<SourceContent, Error> {
  return useQuery({
    ...apiClient.sources.getContent.queryOptions({
      input: { id, userId: options.userId },
    }),
    enabled,
  });
}
