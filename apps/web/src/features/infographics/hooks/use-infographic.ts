// features/infographics/hooks/use-infographic.ts

import {
  useSuspenseQuery,
  type UseSuspenseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type Infographic = RouterOutput['infographics']['get'];

/**
 * Fetch a single infographic by ID.
 * Uses Suspense - wrap with SuspenseBoundary.
 */
export function useInfographic(
  infographicId: string,
): UseSuspenseQueryResult<Infographic, Error> {
  return useSuspenseQuery(
    apiClient.infographics.get.queryOptions({ input: { id: infographicId } }),
  );
}

/**
 * Get the query key for an infographic.
 * Useful for cache operations.
 */
export function getInfographicQueryKey(infographicId: string): QueryKey {
  return apiClient.infographics.get.queryOptions({
    input: { id: infographicId },
  }).queryKey;
}
