import { createCollection } from '@tanstack/db';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import type { RouterOutput } from '@repo/api/client';
import { queryClient } from '@/clients/queryClient';

/**
 * Podcast type from API response (list endpoint)
 */
export type Podcast = RouterOutput['podcasts']['list'][number];

/**
 * Full podcast type with documents and script (get endpoint)
 */
export type PodcastFull = RouterOutput['podcasts']['get'];

/**
 * Podcast list collection - for list views and quick lookups
 */
export const podcastCollection = createCollection(
  queryCollectionOptions<Podcast>({
    queryKey: ['podcasts', 'list'],
    queryFn: async () => {
      // Use the raw client call instead of TanStack Query wrapper
      const response = await fetch(
        `${import.meta.env.VITE_PUBLIC_SERVER_URL}${import.meta.env.VITE_PUBLIC_SERVER_API_PATH}/podcasts`,
        { credentials: 'include' },
      );
      if (!response.ok) throw new Error('Failed to fetch podcasts');
      return response.json();
    },
    queryClient,
    getKey: (podcast) => podcast.id,
    staleTime: 1000 * 60, // 1 minute

    // Mutation handlers - called when collection is mutated
    onDelete: async ({ transaction }) => {
      const podcast = transaction.mutations[0]?.original;
      if (!podcast) return;
      // Call API to delete
      await fetch(
        `${import.meta.env.VITE_PUBLIC_SERVER_URL}${import.meta.env.VITE_PUBLIC_SERVER_API_PATH}/podcasts/${podcast.id}`,
        { method: 'DELETE', credentials: 'include' },
      );
    },
  }),
);

/**
 * Enhanced podcast utilities that handle both collection and query cache
 */
export const podcastUtils = {
  ...podcastCollection.utils,
  /**
   * Refetch podcast data and refetch all podcast queries.
   * Use this after mutations that affect podcast data.
   */
  refetch: async () => {
    // Force refetch all active queries to ensure UI updates
    await queryClient.refetchQueries();
    await podcastCollection.utils.refetch();
  },
};
