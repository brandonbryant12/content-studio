// features/voiceovers/hooks/use-collaborators.ts

import {
  useSuspenseQuery,
  useQuery,
  type UseSuspenseQueryResult,
  type UseQueryResult,
  type QueryKey,
} from '@tanstack/react-query';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';

export type Collaborator =
  RouterOutput['voiceovers']['listCollaborators'][number];
type CollaboratorList = RouterOutput['voiceovers']['listCollaborators'];

/**
 * Fetch collaborators for a voiceover.
 * Uses Suspense - wrap with SuspenseBoundary.
 */
export function useCollaborators(
  voiceoverId: string,
): UseSuspenseQueryResult<CollaboratorList, Error> {
  return useSuspenseQuery(
    apiClient.voiceovers.listCollaborators.queryOptions({
      input: { id: voiceoverId },
    }),
  );
}

/**
 * Fetch collaborators for a voiceover (non-suspense version).
 * Useful when you want to handle loading state manually.
 */
export function useCollaboratorsQuery(
  voiceoverId: string,
  options?: { enabled?: boolean },
): UseQueryResult<CollaboratorList, Error> {
  return useQuery({
    ...apiClient.voiceovers.listCollaborators.queryOptions({
      input: { id: voiceoverId },
    }),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Get the query key for collaborators.
 * Useful for cache operations.
 */
export function getCollaboratorsQueryKey(voiceoverId: string): QueryKey {
  return apiClient.voiceovers.listCollaborators.queryOptions({
    input: { id: voiceoverId },
  }).queryKey;
}
