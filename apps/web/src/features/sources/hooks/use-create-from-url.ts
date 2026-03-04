import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSourceListQueryKey } from './use-source-list';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

export function useCreateFromUrl() {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.sources.fromUrl.mutationOptions({
      onSuccess: (source) => {
        toast.success(
          source.status === 'ready'
            ? 'This URL is already in your sources'
            : 'URL added — content is being processed',
        );
        queryClient.invalidateQueries({
          queryKey: getSourceListQueryKey(),
        });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to add URL'));
      },
    }),
  );
}
