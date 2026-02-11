import type { RouterOutput } from '@repo/api/client';
import { getPodcastListQueryKey } from './use-podcast-list';
import { apiClient } from '@/clients/apiClient';
import { useOptimisticMutation } from '@/shared/hooks';

type PodcastList = RouterOutput['podcasts']['list'];

// Extract mutationFn from oRPC options (always defined for mutations)
const deleteMutationFn =
  apiClient.podcasts.delete.mutationOptions().mutationFn!;

/**
 * Delete podcast from list with optimistic removal.
 * Filters out the deleted podcast immediately, rolls back on error.
 */
export function useOptimisticDeleteList() {
  return useOptimisticMutation<
    Record<string, never>,
    { id: string },
    PodcastList
  >({
    queryKey: getPodcastListQueryKey(),
    mutationFn: deleteMutationFn,
    getOptimisticData: (current, { id }) => {
      if (!current) return undefined;
      return current.filter((podcast) => podcast.id !== id);
    },
    successMessage: 'Podcast deleted',
    errorMessage: 'Failed to delete podcast',
    showSuccessToast: true,
  });
}
