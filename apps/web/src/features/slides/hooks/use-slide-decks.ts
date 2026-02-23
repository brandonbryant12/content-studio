import {
  useQuery,
  type QueryKey,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type SlideDeckList = RouterOutput['slideDecks']['list'];

interface UseSlideDeckListOptions {
  limit?: number;
  enabled?: boolean;
}

export function useSlideDecks(
  options: UseSlideDeckListOptions = {},
): UseQueryResult<SlideDeckList, Error> {
  const { limit, enabled = true } = options;

  return useQuery({
    ...apiClient.slideDecks.list.queryOptions({ input: { limit } }),
    enabled,
  });
}

export function getSlideDeckListQueryKey(
  options: { limit?: number } = {},
): QueryKey {
  return apiClient.slideDecks.list.queryOptions({
    input: { limit: options.limit },
  }).queryKey;
}
