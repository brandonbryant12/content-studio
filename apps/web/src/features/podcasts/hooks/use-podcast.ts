import {
  useSuspenseQuery,
  type UseSuspenseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type Podcast = RouterOutput['podcasts']['get'];

interface PodcastAccessOptions {
  userId?: string;
}

/**
 * Fetch a single podcast by ID.
 * Uses Suspense - wrap with SuspenseBoundary.
 */
export function usePodcast(
  podcastId: string,
  options: PodcastAccessOptions = {},
): UseSuspenseQueryResult<Podcast, Error> {
  return useSuspenseQuery(
    apiClient.podcasts.get.queryOptions({
      input: { id: podcastId, userId: options.userId },
    }),
  );
}

/**
 * Get the query key for a podcast.
 * Useful for cache operations.
 */
export function getPodcastQueryKey(
  podcastId: string,
  options: PodcastAccessOptions = {},
): QueryKey {
  return apiClient.podcasts.get.queryOptions({
    input: { id: podcastId, userId: options.userId },
  }).queryKey;
}
