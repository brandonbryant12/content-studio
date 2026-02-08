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
  enabled?: boolean;
}

export function useInfographicList(
  options: UseInfographicListOptions = {},
): UseQueryResult<InfographicList, Error> {
  const { limit, enabled = true } = options;

  return useQuery({
    ...apiClient.infographics.list.queryOptions({ input: { limit } }),
    enabled,
  });
}

export function useSuspenseInfographicList(
  options: { limit?: number } = {},
): UseSuspenseQueryResult<InfographicList, Error> {
  const { limit } = options;

  return useSuspenseQuery(
    apiClient.infographics.list.queryOptions({ input: { limit } }),
  );
}

export function getInfographicListQueryKey(
  options: { limit?: number } = {},
): QueryKey {
  return apiClient.infographics.list.queryOptions({
    input: { limit: options.limit },
  }).queryKey;
}
