// features/documents/hooks/use-optimistic-delete-document.ts

import { apiClient } from '@/clients/apiClient';
import { useOptimisticMutation } from '@/shared/hooks';
import { getDocumentListQueryKey } from './use-document-list';
import type { RouterOutput } from '@repo/api/client';

type DocumentList = RouterOutput['documents']['list'];

// Extract mutationFn from oRPC options (always defined for mutations)
const deleteMutationFn = apiClient.documents.delete.mutationOptions().mutationFn!;

/**
 * Delete document from list with optimistic removal.
 * Filters out the deleted document immediately, rolls back on error.
 */
export function useOptimisticDeleteDocument() {
  return useOptimisticMutation<Record<string, never>, { id: string }, DocumentList>({
    queryKey: getDocumentListQueryKey(),
    mutationFn: deleteMutationFn,
    getOptimisticData: (current, { id }) => {
      if (!current) return undefined;
      return current.filter((document) => document.id !== id);
    },
    successMessage: 'Document deleted',
    errorMessage: 'Failed to delete document',
    showSuccessToast: true,
  });
}
