// features/podcasts/hooks/use-collaborators.ts

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
  RouterOutput['podcasts']['listCollaborators'][number];
type CollaboratorList = RouterOutput['podcasts']['listCollaborators'];

/**
 * Fetch collaborators for a podcast.
 * Uses Suspense - wrap with SuspenseBoundary.
 */
export function useCollaborators(
  podcastId: string,
): UseSuspenseQueryResult<CollaboratorList, Error> {
  return useSuspenseQuery(
    apiClient.podcasts.listCollaborators.queryOptions({
      input: { id: podcastId },
    }),
  );
}

/**
 * Fetch collaborators for a podcast (non-suspense version).
 * Useful when you want to handle loading state manually.
 */
export function useCollaboratorsQuery(
  podcastId: string,
  options?: { enabled?: boolean },
): UseQueryResult<CollaboratorList, Error> {
  return useQuery({
    ...apiClient.podcasts.listCollaborators.queryOptions({
      input: { id: podcastId },
    }),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Get the query key for collaborators.
 * Useful for cache operations.
 */
export function getCollaboratorsQueryKey(podcastId: string): QueryKey {
  return apiClient.podcasts.listCollaborators.queryOptions({
    input: { id: podcastId },
  }).queryKey;
}
