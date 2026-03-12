import {
  useSuspenseQuery,
  type UseSuspenseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type InfographicFull = RouterOutput['infographics']['get'];

interface InfographicAccessOptions {
  userId?: string;
}

/**
 * Fetch a single infographic by ID.
 * Uses Suspense - wrap with SuspenseBoundary.
 */
export function useInfographic(
  infographicId: string,
  options: InfographicAccessOptions = {},
): UseSuspenseQueryResult<InfographicFull, Error> {
  return useSuspenseQuery(
    apiClient.infographics.get.queryOptions({
      input: { id: infographicId, userId: options.userId },
    }),
  );
}

/**
 * Get the query key for an infographic.
 * Useful for cache operations.
 */
export function getInfographicQueryKey(
  infographicId: string,
  options: InfographicAccessOptions = {},
): QueryKey {
  return apiClient.infographics.get.queryOptions({
    input: { id: infographicId, userId: options.userId },
  }).queryKey;
}
