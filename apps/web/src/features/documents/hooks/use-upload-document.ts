import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getDocumentListQueryKey } from './use-document-list';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

/**
 * Upload document mutation with query invalidation.
 */
export function useUploadDocument(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.sources.upload.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getDocumentListQueryKey() });
        toast.success('Source uploaded');
        options?.onSuccess?.();
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to upload source'));
      },
    }),
  );
}
