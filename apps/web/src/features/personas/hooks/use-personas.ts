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

interface UsePersonasOptions {
  role?: 'host' | 'cohost';
  enabled?: boolean;
}

/**
 * Fetch persona list with options.
 * Use this for conditional fetching or optional data.
 */
export function usePersonas(
  options: UsePersonasOptions = {},
): UseQueryResult<PersonaList, Error> {
  const { role, enabled = true } = options;

  return useQuery({
    ...apiClient.personas.list.queryOptions({ input: { role } }),
    enabled,
  });
}

/**
 * Fetch persona list with Suspense.
 * Use this when the list is required to render.
 */
export function useSuspensePersonas(
  options: { role?: 'host' | 'cohost' } = {},
): UseSuspenseQueryResult<PersonaList, Error> {
  const { role } = options;

  return useSuspenseQuery(
    apiClient.personas.list.queryOptions({ input: { role } }),
  );
}

/**
 * Get the query key for persona list.
 * Useful for cache operations.
 */
export function getPersonaListQueryKey(
  options: { role?: 'host' | 'cohost' } = {},
): QueryKey {
  return apiClient.personas.list.queryOptions({
    input: { role: options.role },
  }).queryKey;
}
