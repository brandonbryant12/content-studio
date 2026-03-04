import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSourceListQueryKey } from './use-source-list';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

/**
 * Upload source mutation with query invalidation.
 */
export function useUploadSource(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.sources.upload.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getSourceListQueryKey() });
        toast.success('Source uploaded');
        options?.onSuccess?.();
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to upload source'));
      },
    }),
  );
}
