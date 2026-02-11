import type { RouterOutput } from '@repo/api/client';
import { getVoiceoverListQueryKey } from './use-voiceover-list';
import { apiClient } from '@/clients/apiClient';
import { useOptimisticMutation } from '@/shared/hooks';

type VoiceoverList = RouterOutput['voiceovers']['list'];

// Extract mutationFn from oRPC options (always defined for mutations)
const deleteMutationFn =
  apiClient.voiceovers.delete.mutationOptions().mutationFn!;

/**
 * Delete voiceover from list with optimistic removal.
 * Filters out the deleted voiceover immediately, rolls back on error.
 */
export function useOptimisticDeleteList() {
  return useOptimisticMutation<
    Record<string, never>,
    { id: string },
    VoiceoverList
  >({
    queryKey: getVoiceoverListQueryKey(),
    mutationFn: deleteMutationFn,
    getOptimisticData: (current, { id }) => {
      if (!current) return undefined;
      return current.filter((voiceover) => voiceover.id !== id);
    },
    successMessage: 'Voiceover deleted',
    errorMessage: 'Failed to delete voiceover',
    showSuccessToast: true,
  });
}
