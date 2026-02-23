import {
  useSuspenseQuery,
  type QueryKey,
  type UseSuspenseQueryResult,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type SlideDeckFull = RouterOutput['slideDecks']['get'];

export function useSlideDeck(
  slideDeckId: string,
): UseSuspenseQueryResult<SlideDeckFull, Error> {
  return useSuspenseQuery(
    apiClient.slideDecks.get.queryOptions({
      input: { id: slideDeckId },
    }),
  );
}

export function getSlideDeckQueryKey(slideDeckId: string): QueryKey {
  return apiClient.slideDecks.get.queryOptions({
    input: { id: slideDeckId },
  }).queryKey;
}
