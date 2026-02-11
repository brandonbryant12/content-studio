import { VoiceoverStatus } from '@repo/db/schema';
import { useQueryClient } from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { getVoiceoverQueryKey } from './use-voiceover';
import { getVoiceoverListQueryKey } from './use-voiceover-list';
import { apiClient } from '@/clients/apiClient';
import { useOptimisticMutation } from '@/shared/hooks/use-optimistic-mutation';

type Voiceover = RouterOutput['voiceovers']['get'];

// Extract mutationFn from oRPC options (always defined for mutations)
const generateMutationFn =
  apiClient.voiceovers.generate.mutationOptions().mutationFn!;

/**
 * Optimistic mutation for voiceover audio generation.
 * Shows 'generating_audio' status immediately while job queues.
 */
export function useOptimisticGeneration(voiceoverId: string) {
  const queryClient = useQueryClient();
  const queryKey = getVoiceoverQueryKey(voiceoverId);

  return useOptimisticMutation<
    { jobId: string; status: string },
    { id: string },
    Voiceover
  >({
    queryKey,
    mutationFn: generateMutationFn,

    getOptimisticData: (current) => {
      if (!current) return undefined;

      return {
        ...current,
        status: VoiceoverStatus.GENERATING_AUDIO,
        audioUrl: null,
        duration: null,
      };
    },

    successMessage: 'Generation started',
    errorMessage: 'Failed to start generation',
    showSuccessToast: true,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getVoiceoverListQueryKey(),
      });
    },
  });
}
