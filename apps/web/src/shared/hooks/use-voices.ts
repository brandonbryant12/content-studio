import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/clients/apiClient';

/**
 * Query hook for the full voice list with preview URLs.
 * Cached indefinitely — voice previews don't change at runtime.
 */
export function useVoices() {
  return useQuery({
    ...apiClient.voices.list.queryOptions({ input: {} }),
    staleTime: Infinity,
  });
}
