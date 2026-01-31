// features/brands/hooks/use-brand.ts

import {
  useSuspenseQuery,
  type UseSuspenseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type Brand = RouterOutput['brands']['get'];

/**
 * Fetch a single brand by ID.
 * Uses Suspense - wrap with SuspenseBoundary.
 */
export function useBrand(
  brandId: string,
): UseSuspenseQueryResult<Brand, Error> {
  return useSuspenseQuery(
    apiClient.brands.get.queryOptions({ input: { id: brandId } }),
  );
}

/**
 * Get the query key for a brand.
 * Useful for cache operations.
 */
export function getBrandQueryKey(brandId: string): QueryKey {
  return apiClient.brands.get.queryOptions({ input: { id: brandId } }).queryKey;
}
