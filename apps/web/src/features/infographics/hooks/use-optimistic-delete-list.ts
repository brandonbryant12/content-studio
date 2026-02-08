import type { RouterOutput } from '@repo/api/client';
import { getInfographicListQueryKey } from './use-infographic-list';
import { apiClient } from '@/clients/apiClient';
import { useOptimisticMutation } from '@/shared/hooks';

type InfographicList = RouterOutput['infographics']['list'];

const deleteMutationFn =
  apiClient.infographics.delete.mutationOptions().mutationFn!;

export function useOptimisticDeleteList() {
  return useOptimisticMutation<
    Record<string, never>,
    { id: string },
    InfographicList
  >({
    queryKey: getInfographicListQueryKey(),
    mutationFn: deleteMutationFn,
    getOptimisticData: (current, { id }) => {
      if (!current) return undefined;
      return current.filter((infographic) => infographic.id !== id);
    },
    successMessage: 'Infographic deleted',
    errorMessage: 'Failed to delete infographic',
    showSuccessToast: true,
  });
}
