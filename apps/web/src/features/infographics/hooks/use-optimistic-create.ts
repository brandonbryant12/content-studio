import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { getInfographicListQueryKey } from './use-infographic-list';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

export function useOptimisticCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.infographics.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: getInfographicListQueryKey(),
        });
        navigate({
          to: '/infographics/$infographicId',
          params: { infographicId: data.id },
        });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to create infographic'));
      },
    }),
  );
}
