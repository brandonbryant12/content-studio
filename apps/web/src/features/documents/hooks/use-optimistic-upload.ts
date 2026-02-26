import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getDocumentListQueryKey } from './use-document-list';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

/**
 * Upload document mutation with query invalidation.
 * Uses standard mutation (not optimistic) since the document is server-processed.
 */
export function useOptimisticUpload(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.documents.upload.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getDocumentListQueryKey() });
        toast.success('Document uploaded');
        options?.onSuccess?.();
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to upload document'));
      },
    }),
  );
}
