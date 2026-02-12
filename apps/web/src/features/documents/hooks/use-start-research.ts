import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getDocumentListQueryKey } from './use-document-list';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

export function useStartResearch() {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.documents.fromResearch.mutationOptions({
      onSuccess: () => {
        toast.success('Research started — this may take a few minutes');
        queryClient.invalidateQueries({
          queryKey: getDocumentListQueryKey(),
        });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to start research'));
      },
    }),
  );
}
