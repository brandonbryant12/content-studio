// features/voiceovers/hooks/use-voiceover.ts

import {
  useSuspenseQuery,
  type UseSuspenseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

type Voiceover = RouterOutput['voiceovers']['get'];

/**
 * Fetch a single voiceover by ID.
 * Uses Suspense - wrap with SuspenseBoundary.
 */
export function useVoiceover(
  voiceoverId: string,
): UseSuspenseQueryResult<Voiceover, Error> {
  return useSuspenseQuery(
    apiClient.voiceovers.get.queryOptions({ input: { id: voiceoverId } }),
  );
}

/**
 * Get the query key for a voiceover.
 * Useful for cache operations.
 */
export function getVoiceoverQueryKey(voiceoverId: string): QueryKey {
  return apiClient.voiceovers.get.queryOptions({ input: { id: voiceoverId } })
    .queryKey;
}
