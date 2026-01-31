// features/brands/hooks/use-optimistic-update.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';
import { getBrandQueryKey } from './use-brand';
import { getBrandListQueryKey } from './use-brand-list';

/**
 * Update brand mutation with cache invalidation.
 */
export function useOptimisticUpdate() {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.brands.update.mutationOptions({
      onSuccess: (data) => {
        // Invalidate both the specific brand and the list
        queryClient.invalidateQueries({ queryKey: getBrandQueryKey(data.id) });
        queryClient.invalidateQueries({ queryKey: getBrandListQueryKey() });
        toast.success('Brand saved');
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to save brand'));
      },
    }),
  );
}
