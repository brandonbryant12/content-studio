import { InfographicStatus } from '@repo/db/schema';
import { useQueryClient } from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { getInfographicQueryKey } from './use-infographic';
import { getInfographicListQueryKey } from './use-infographic-list';
import { apiClient } from '@/clients/apiClient';
import { useOptimisticMutation } from '@/shared/hooks/use-optimistic-mutation';

type InfographicFull = RouterOutput['infographics']['get'];

const generateMutationFn =
  apiClient.infographics.generate.mutationOptions().mutationFn!;

/**
 * Optimistic mutation for infographic generation.
 * Shows 'generating' status immediately while job queues.
 */
export function useOptimisticGeneration(infographicId: string) {
  const queryClient = useQueryClient();
  const queryKey = getInfographicQueryKey(infographicId);

  return useOptimisticMutation<
    { jobId: string; status: string },
    { id: string },
    InfographicFull
  >({
    queryKey,
    mutationFn: generateMutationFn,

    getOptimisticData: (current) => {
      if (!current) return undefined;

      return {
        ...current,
        status: InfographicStatus.GENERATING,
        errorMessage: null,
      };
    },

    successMessage: 'Generation started',
    errorMessage: 'Failed to start generation',
    showSuccessToast: true,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getInfographicListQueryKey(),
      });
    },
  });
}
