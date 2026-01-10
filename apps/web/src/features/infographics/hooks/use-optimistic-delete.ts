// features/infographics/hooks/use-optimistic-delete.ts

import { apiClient } from '@/clients/apiClient';
import { useOptimisticMutation } from '@/shared/hooks';
import { getInfographicListQueryKey } from './use-infographic-list';
import type { RouterOutput } from '@repo/api/client';

type InfographicList = RouterOutput['infographics']['list'];

// Extract mutationFn from oRPC options (always defined for mutations)
const deleteMutationFn =
  apiClient.infographics.delete.mutationOptions().mutationFn!;

/**
 * Optimistic delete - removes infographic from list immediately.
 * Filters out the deleted infographic immediately, rolls back on error.
 */
export function useOptimisticDelete() {
  return useOptimisticMutation<
    Record<string, never>,
    { id: string },
    InfographicList
  >({
    queryKey: getInfographicListQueryKey(),
    mutationFn: deleteMutationFn,
    getOptimisticData: (current, { id }) => {
      if (!current) return undefined;
      return {
        ...current,
        items: current.items.filter((infographic) => infographic.id !== id),
        total: current.total - 1,
      };
    },
    successMessage: 'Infographic deleted',
    errorMessage: 'Failed to delete infographic',
    showSuccessToast: true,
  });
}
