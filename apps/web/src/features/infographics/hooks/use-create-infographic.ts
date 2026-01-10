// features/infographics/hooks/use-create-infographic.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';
import { getInfographicListQueryKey } from './use-infographic-list';

/**
 * Create infographic mutation with navigation on success.
 * Uses standard mutation (not optimistic) since the ID is server-generated.
 */
export function useCreateInfographic() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.infographics.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: getInfographicListQueryKey(),
        });
        // Navigate to the new infographic detail page
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigate({
          to: '/infographics/$infographicId',
          params: { infographicId: data.id },
        } as any);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to create infographic'));
      },
    }),
  );
}
