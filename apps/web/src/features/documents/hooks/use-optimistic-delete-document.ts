import type { RouterOutput } from '@repo/api/client';
import { getDocumentListQueryKey } from './use-document-list';
import { apiClient } from '@/clients/apiClient';
import { useOptimisticMutation } from '@/shared/hooks';

type DocumentList = RouterOutput['sources']['list'];

// Extract mutationFn from oRPC options (always defined for mutations)
const deleteMutationFn = apiClient.sources.delete.mutationOptions().mutationFn!;

/**
 * Delete document from list with optimistic removal.
 * Filters out the deleted document immediately, rolls back on error.
 */
export function useOptimisticDeleteDocument() {
  return useOptimisticMutation<
    Record<string, never>,
    { id: string },
    DocumentList
  >({
    queryKey: getDocumentListQueryKey(),
    mutationFn: deleteMutationFn,
    getOptimisticData: (current, { id }) => {
      if (!current) return undefined;
      return current.filter((document) => document.id !== id);
    },
    successMessage: 'Source deleted',
    errorMessage: 'Failed to delete source',
    showSuccessToast: true,
  });
}
