import type { RouterOutput } from '@repo/api/client';
import { getSourceListQueryKey } from './use-source-list';
import { apiClient } from '@/clients/apiClient';
import { useOptimisticMutation } from '@/shared/hooks';

type SourceList = RouterOutput['sources']['list'];

// Extract mutationFn from oRPC options (always defined for mutations)
const deleteMutationFn = apiClient.sources.delete.mutationOptions().mutationFn!;

/**
 * Delete source from list with optimistic removal.
 * Filters out the deleted source immediately, rolls back on error.
 */
export function useOptimisticDeleteSource() {
  return useOptimisticMutation<
    Record<string, never>,
    { id: string },
    SourceList
  >({
    queryKey: getSourceListQueryKey(),
    mutationFn: deleteMutationFn,
    getOptimisticData: (current, { id }) => {
      if (!current) return undefined;
      return current.filter((source) => source.id !== id);
    },
    successMessage: 'Source deleted',
    errorMessage: 'Failed to delete source',
    showSuccessToast: true,
  });
}
