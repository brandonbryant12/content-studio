// features/brands/hooks/use-optimistic-create.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';
import { getBrandListQueryKey } from './use-brand-list';

/**
 * Create brand mutation with navigation on success.
 * Uses standard mutation (not optimistic) since the ID is server-generated.
 */
export function useOptimisticCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.brands.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getBrandListQueryKey() });
        navigate({
          to: '/brands/$brandId',
          params: { brandId: data.id },
        });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to create brand'));
      },
    }),
  );
}
