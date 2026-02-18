import {
  useQuery,
  type UseQueryResult,
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
 * Get the query key for persona list.
 * Useful for cache operations.
 */
export function getPersonaListQueryKey(
  options: { limit?: number } = {},
): QueryKey {
  return apiClient.personas.list.queryOptions({ input: options }).queryKey;
}
