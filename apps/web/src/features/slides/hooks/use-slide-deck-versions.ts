import {
  useQuery,
  type QueryKey,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

export type SlideDeckVersion = RouterOutput['slideDecks']['listVersions'][number];

export function useSlideDeckVersions(
  slideDeckId: string,
): UseQueryResult<readonly SlideDeckVersion[], Error> {
  return useQuery(apiClient.slideDecks.listVersions.queryOptions({
    input: { id: slideDeckId },
  }));
}

export function getSlideDeckVersionsQueryKey(slideDeckId: string): QueryKey {
  return apiClient.slideDecks.listVersions.queryOptions({
    input: { id: slideDeckId },
  }).queryKey;
}
