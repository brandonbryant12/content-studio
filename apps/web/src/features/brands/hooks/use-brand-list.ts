// features/brands/hooks/use-brand-list.ts

import {
  useQuery,
  useSuspenseQuery,
  type UseQueryResult,
  type UseSuspenseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type BrandList = RouterOutput['brands']['list'];

interface UseBrandListOptions {
  limit?: number;
  enabled?: boolean;
}

/**
 * Fetch brand list with options.
 * Use this for conditional fetching or optional data.
 */
export function useBrandList(
  options: UseBrandListOptions = {},
): UseQueryResult<BrandList, Error> {
  const { limit, enabled = true } = options;

  return useQuery({
    ...apiClient.brands.list.queryOptions({ input: { limit } }),
    enabled,
  });
}

/**
 * Fetch brand list with Suspense.
 * Use this when the list is required to render.
 */
export function useSuspenseBrandList(
  options: { limit?: number } = {},
): UseSuspenseQueryResult<BrandList, Error> {
  const { limit } = options;

  return useSuspenseQuery(
    apiClient.brands.list.queryOptions({ input: { limit } }),
  );
}

/**
 * Get the query key for brand list.
 * Useful for cache operations.
 */
export function getBrandListQueryKey(
  options: { limit?: number } = {},
): QueryKey {
  return apiClient.brands.list.queryOptions({
    input: { limit: options.limit },
  }).queryKey;
}

/**
 * Fetch brand list with ordering and limit.
 * Use this for displaying ordered brand lists with optional limits.
 */
export function useBrandsOrdered(
  options: { limit?: number; orderBy?: 'asc' | 'desc'; enabled?: boolean } = {},
): UseQueryResult<BrandList, Error> {
  const { limit, orderBy = 'desc', enabled = true } = options;

  return useQuery({
    ...apiClient.brands.list.queryOptions({ input: { limit } }),
    enabled,
    select: (data) => {
      // ISO 8601 dates are lexicographically sortable - no Date objects needed
      const sorted = [...data].sort((a, b) =>
        orderBy === 'desc'
          ? b.createdAt.localeCompare(a.createdAt)
          : a.createdAt.localeCompare(b.createdAt),
      );
      return limit ? sorted.slice(0, limit) : sorted;
    },
  });
}
