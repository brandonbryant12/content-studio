import { useQuery, type QueryKey } from '@tanstack/react-query';
import { apiClient } from '@/clients/apiClient';

interface UsePersonaListOptions {
  limit?: number;
  enabled?: boolean;
}

export function usePersonaList(options: UsePersonaListOptions = {}) {
  const { limit, enabled = true } = options;

  return useQuery({
    ...apiClient.personas.list.queryOptions({ input: { limit } }),
    enabled,
  });
}

export function getPersonaListQueryKey(
  options: { limit?: number } = {},
): QueryKey {
  return apiClient.personas.list.queryOptions({
    input: { limit: options.limit },
  }).queryKey;
}
