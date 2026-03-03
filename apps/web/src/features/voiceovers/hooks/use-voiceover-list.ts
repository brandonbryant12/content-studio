import { useQuery, type QueryKey } from '@tanstack/react-query';
import { apiClient } from '@/clients/apiClient';

interface UseVoiceoverListOptions {
  limit?: number;
  enabled?: boolean;
}

export function useVoiceoverList(options: UseVoiceoverListOptions = {}) {
  const { limit, enabled = true } = options;

  return useQuery({
    ...apiClient.voiceovers.list.queryOptions({ input: { limit } }),
    enabled,
  });
}

export function getVoiceoverListQueryKey(
  options: { limit?: number } = {},
): QueryKey {
  return apiClient.voiceovers.list.queryOptions({
    input: { limit: options.limit },
  }).queryKey;
}

export function useVoiceoversOrdered(
  options: { limit?: number; orderBy?: 'asc' | 'desc'; enabled?: boolean } = {},
) {
  const { limit, orderBy = 'desc', enabled = true } = options;

  return useQuery({
    ...apiClient.voiceovers.list.queryOptions({ input: { limit } }),
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
