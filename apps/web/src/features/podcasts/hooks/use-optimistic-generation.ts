// features/podcasts/hooks/use-optimistic-generation.ts

import { useQueryClient } from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { VersionStatus } from '@repo/db/schema';
import { apiClient } from '@/clients/apiClient';
import { useOptimisticMutation } from '@/shared/hooks/use-optimistic-mutation';
import { getPodcastQueryKey } from './use-podcast';

type Podcast = RouterOutput['podcasts']['get'];

// Extract mutationFn from oRPC options (always defined for mutations)
const generateMutationFn =
  apiClient.podcasts.generate.mutationOptions().mutationFn!;

/**
 * Optimistic mutation for full podcast generation (script + audio).
 * Shows 'generating_script' status immediately while job queues.
 */
export function useOptimisticGeneration(podcastId: string) {
  const queryClient = useQueryClient();
  const queryKey = getPodcastQueryKey(podcastId);

  return useOptimisticMutation<
    { jobId: string; status: string },
    { id: string; promptInstructions?: string },
    Podcast
  >({
    queryKey,
    mutationFn: generateMutationFn,

    getOptimisticData: (current) => {
      if (!current) return undefined;

      return {
        ...current,
        status: VersionStatus.GENERATING_SCRIPT,
        segments: null,
        audioUrl: null,
      };
    },

    successMessage: 'Generation started',
    errorMessage: 'Failed to start generation',
    showSuccessToast: true,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['podcasts', 'list'],
      });
    },
  });
}
