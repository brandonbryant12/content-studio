// features/podcasts/hooks/use-optimistic-delete.ts

import { useNavigate } from '@tanstack/react-router';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';
import { useOptimisticMutation } from '@/shared/hooks/use-optimistic-mutation';
import { getPodcastListQueryKey } from './use-podcast-list';

type PodcastList = RouterOutput['podcasts']['list'];

// Extract mutationFn from oRPC options (always defined for mutations)
const deleteMutationFn =
  apiClient.podcasts.delete.mutationOptions().mutationFn!;

/**
 * Optimistic delete - removes podcast from list immediately.
 * Navigates to podcast list on success.
 */
export function useOptimisticDelete() {
  const navigate = useNavigate();
  const queryKey = getPodcastListQueryKey();

  // The delete mutation returns an empty object, not void
  return useOptimisticMutation<
    Record<string, never>,
    { id: string },
    PodcastList
  >({
    queryKey,
    mutationFn: deleteMutationFn,

    getOptimisticData: (current, variables) => {
      if (!current) return undefined;
      return current.filter((p) => p.id !== variables.id);
    },

    successMessage: 'Podcast deleted',
    errorMessage: 'Failed to delete podcast',
    showSuccessToast: true,

    onSuccess: () => {
      navigate({ to: '/podcasts' });
    },
  });
}
