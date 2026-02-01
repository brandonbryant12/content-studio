// features/brands/hooks/use-optimistic-delete-list.ts

import type { RouterOutput } from '@repo/api/client';
import { getBrandListQueryKey } from './use-brand-list';
import { apiClient } from '@/clients/apiClient';
import { useOptimisticMutation } from '@/shared/hooks';

type BrandList = RouterOutput['brands']['list'];

// Extract mutationFn from oRPC options (always defined for mutations)
const deleteMutationFn = apiClient.brands.delete.mutationOptions().mutationFn!;

/**
 * Delete brand from list with optimistic removal.
 * Filters out the deleted brand immediately, rolls back on error.
 */
export function useOptimisticDeleteList() {
  return useOptimisticMutation<
    Record<string, never>,
    { id: string },
    BrandList
  >({
    queryKey: getBrandListQueryKey(),
    mutationFn: deleteMutationFn,
    getOptimisticData: (current, { id }) => {
      if (!current) return undefined;
      return current.filter((brand) => brand.id !== id);
    },
    successMessage: 'Brand deleted',
    errorMessage: 'Failed to delete brand',
    showSuccessToast: true,
  });
}
