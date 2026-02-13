import {
  useQuery,
  useSuspenseQuery,
  type UseQueryResult,
  type UseSuspenseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type PersonaList = RouterOutput['personas']['list'];

interface UsePersonaListOptions {
  limit?: number;
  enabled?: boolean;
}

/**
 * Fetch persona list with options.
 * Use this for conditional fetching or optional data.
 */
export function usePersonaList(
  options: UsePersonaListOptions = {},
): UseQueryResult<PersonaList, Error> {
  const { limit, enabled = true } = options;

  return useQuery({
    ...apiClient.personas.list.queryOptions({ input: { limit } }),
    enabled,
  });
}

/**
 * Fetch persona list with Suspense.
 * Use this when the list is required to render.
 */
export function useSuspensePersonaList(
  options: { limit?: number } = {},
): UseSuspenseQueryResult<PersonaList, Error> {
  return useSuspenseQuery(
    apiClient.personas.list.queryOptions({ input: options }),
  );
}

/**
 * Get the query key for persona list.
 * Useful for cache operations.
 */
export function getPersonaListQueryKey(
  options: { limit?: number } = {},
): QueryKey {
  return apiClient.personas.list.queryOptions({ input: options }).queryKey;
}
