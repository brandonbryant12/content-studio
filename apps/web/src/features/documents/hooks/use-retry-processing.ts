import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/clients/apiClient';
import { getDocumentListQueryKey } from './use-document-list';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/lib/errors';

export function useRetryProcessing() {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.documents.retry.mutationOptions({
      onSuccess: () => {
        toast.success('Retrying — content is being reprocessed');
        queryClient.invalidateQueries({
          queryKey: getDocumentListQueryKey(),
        });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to retry processing'));
      },
    }),
  );
}
