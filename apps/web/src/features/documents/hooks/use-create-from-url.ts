import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/clients/apiClient';
import { getDocumentListQueryKey } from './use-document-list';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/lib/errors';

export function useCreateFromUrl() {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.documents.fromUrl.mutationOptions({
      onSuccess: () => {
        toast.success('URL added — content is being processed');
        queryClient.invalidateQueries({
          queryKey: getDocumentListQueryKey(),
        });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to add URL'));
      },
    }),
  );
}
