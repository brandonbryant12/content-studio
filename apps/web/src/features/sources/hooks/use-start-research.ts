import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getSourceListQueryKey } from './use-source-list';
import { apiClient } from '@/clients/apiClient';

export function useStartResearch() {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.sources.fromResearch.mutationOptions({
      onSuccess: () => {
        toast.success('Research started — this may take a few minutes');
        queryClient.invalidateQueries({
          queryKey: getSourceListQueryKey(),
        });
      },
    }),
  );
}
