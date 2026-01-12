// features/infographics/hooks/use-infographic-list.ts

import {
  useQuery,
  useSuspenseQuery,
  type UseQueryResult,
  type UseSuspenseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type InfographicList = RouterOutput['infographics']['list'];

interface UseInfographicListOptions {
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

/**
 * Fetch infographic list with options.
 * Use this for conditional fetching or optional data.
 */
export function useInfographicList(
  options: UseInfographicListOptions = {},
): UseQueryResult<InfographicList, Error> {
  const { limit, offset, enabled = true } = options;

  return useQuery({
    ...apiClient.infographics.list.queryOptions({ input: { limit, offset } }),
    enabled,
  });
}

/**
 * Fetch infographic list with Suspense.
 * Use this when the list is required to render.
 */
export function useSuspenseInfographicList(
  options: { limit?: number; offset?: number } = {},
): UseSuspenseQueryResult<InfographicList, Error> {
  const { limit, offset } = options;

  return useSuspenseQuery(
    apiClient.infographics.list.queryOptions({ input: { limit, offset } }),
  );
}

/**
 * Get the query key for infographic list.
 * Useful for cache operations.
 */
export function getInfographicListQueryKey(
  options: { limit?: number; offset?: number } = {},
): QueryKey {
  return apiClient.infographics.list.queryOptions({
    input: { limit: options.limit, offset: options.offset },
  }).queryKey;
}
