// features/voiceovers/hooks/use-voiceover-list.ts

import {
  useQuery,
  useSuspenseQuery,
  type UseQueryResult,
  type UseSuspenseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type VoiceoverList = RouterOutput['voiceovers']['list'];

interface UseVoiceoverListOptions {
  limit?: number;
  enabled?: boolean;
}

/**
 * Fetch voiceover list with options.
 * Use this for conditional fetching or optional data.
 */
export function useVoiceoverList(
  options: UseVoiceoverListOptions = {},
): UseQueryResult<VoiceoverList, Error> {
  const { limit, enabled = true } = options;

  return useQuery({
    ...apiClient.voiceovers.list.queryOptions({ input: { limit } }),
    enabled,
  });
}

/**
 * Fetch voiceover list with Suspense.
 * Use this when the list is required to render.
 */
export function useSuspenseVoiceoverList(
  options: { limit?: number } = {},
): UseSuspenseQueryResult<VoiceoverList, Error> {
  const { limit } = options;

  return useSuspenseQuery(
    apiClient.voiceovers.list.queryOptions({ input: { limit } }),
  );
}

/**
 * Get the query key for voiceover list.
 * Useful for cache operations.
 */
export function getVoiceoverListQueryKey(
  options: { limit?: number } = {},
): QueryKey {
  return apiClient.voiceovers.list.queryOptions({
    input: { limit: options.limit },
  }).queryKey;
}

/**
 * Fetch voiceover list with ordering and limit.
 * Use this for displaying ordered voiceover lists with optional limits.
 */
export function useVoiceoversOrdered(
  options: { limit?: number; orderBy?: 'asc' | 'desc'; enabled?: boolean } = {},
): UseQueryResult<VoiceoverList, Error> {
  const { limit, orderBy = 'desc', enabled = true } = options;

  return useQuery({
    ...apiClient.voiceovers.list.queryOptions({ input: { limit } }),
    enabled,
    select: (data) => {
      const sorted = [...data].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return orderBy === 'desc' ? dateB - dateA : dateA - dateB;
      });
      return limit ? sorted.slice(0, limit) : sorted;
    },
  });
}
