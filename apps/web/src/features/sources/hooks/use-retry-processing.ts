import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSourceQueryKey } from './use-source';
import { getSourceListQueryKey } from './use-source-list';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

export function useRetryProcessing() {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.sources.retry.mutationOptions({
      onSuccess: (source, variables) => {
        queryClient.setQueryData(getSourceQueryKey(variables.id), source);
        toast.success('Retrying — content is being reprocessed');
        queryClient.invalidateQueries({
          queryKey: getSourceListQueryKey(),
        });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to retry processing'));
      },
    }),
  );
}
