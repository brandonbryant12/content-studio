// features/podcasts/hooks/use-podcast.ts

import {
  useSuspenseQuery,
  type UseSuspenseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type Podcast = RouterOutput['podcasts']['get'];

/**
 * Fetch a single podcast by ID.
 * Uses Suspense - wrap with SuspenseBoundary.
 */
export function usePodcast(
  podcastId: string,
): UseSuspenseQueryResult<Podcast, Error> {
  return useSuspenseQuery(
    apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }),
  );
}

/**
 * Get the query key for a podcast.
 * Useful for cache operations.
 */
export function getPodcastQueryKey(podcastId: string): QueryKey {
  return apiClient.podcasts.get.queryOptions({ input: { id: podcastId } })
    .queryKey;
}
