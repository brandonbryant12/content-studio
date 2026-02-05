import {
  useQuery,
  useSuspenseQuery,
  type UseQueryResult,
  type UseSuspenseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type AudienceSegmentList = RouterOutput['audienceSegments']['list'];

interface UseAudienceSegmentsOptions {
  enabled?: boolean;
}

/**
 * Fetch audience segment list.
 * Use this for conditional fetching or optional data.
 */
export function useAudienceSegments(
  options: UseAudienceSegmentsOptions = {},
): UseQueryResult<AudienceSegmentList, Error> {
  const { enabled = true } = options;

  return useQuery({
    ...apiClient.audienceSegments.list.queryOptions({ input: {} }),
    enabled,
  });
}

/**
 * Fetch audience segment list with Suspense.
 * Use this when the list is required to render.
 */
export function useSuspenseAudienceSegments(): UseSuspenseQueryResult<
  AudienceSegmentList,
  Error
> {
  return useSuspenseQuery(
    apiClient.audienceSegments.list.queryOptions({ input: {} }),
  );
}

/**
 * Get the query key for audience segment list.
 * Useful for cache operations.
 */
export function getAudienceSegmentListQueryKey(): QueryKey {
  return apiClient.audienceSegments.list.queryOptions({ input: {} }).queryKey;
}
