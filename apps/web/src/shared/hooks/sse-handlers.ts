// shared/hooks/sse-handlers.ts

import type {
  JobCompletionEvent,
  VoiceoverJobCompletionEvent,
  EntityChangeEvent,
} from '@repo/api/contracts';
import type { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/clients/apiClient';

// ============================================================================
// Query Key Helpers
// ============================================================================

const getPodcastQueryKey = (podcastId: string) =>
  apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }).queryKey;

const getPodcastsListQueryKey = () =>
  apiClient.podcasts.list.queryOptions({ input: {} }).queryKey;

const getDocumentQueryKey = (documentId: string) =>
  apiClient.documents.get.queryOptions({ input: { id: documentId } }).queryKey;

const getDocumentsListQueryKey = () =>
  apiClient.documents.list.queryOptions({ input: {} }).queryKey;

const getVoiceoverQueryKey = (voiceoverId: string) =>
  apiClient.voiceovers.get.queryOptions({ input: { id: voiceoverId } })
    .queryKey;

const getVoiceoversListQueryKey = () =>
  apiClient.voiceovers.list.queryOptions({ input: {} }).queryKey;

// ============================================================================
// Event Handlers
// ============================================================================

export function handleJobCompletion(
  event: JobCompletionEvent,
  queryClient: QueryClient,
): void {
  const { jobType, podcastId } = event;

  // Invalidate specific podcast
  if (podcastId) {
    queryClient.invalidateQueries({
      queryKey: getPodcastQueryKey(podcastId),
    });
  }

  // Invalidate list for job types that affect list display
  switch (jobType) {
    case 'generate-podcast':
    case 'generate-script':
    case 'generate-audio':
      queryClient.invalidateQueries({
        queryKey: getPodcastsListQueryKey(),
      });
      break;
  }
}

export function handleVoiceoverJobCompletion(
  event: VoiceoverJobCompletionEvent,
  queryClient: QueryClient,
): void {
  const { voiceoverId } = event;

  // Invalidate specific voiceover
  queryClient.invalidateQueries({
    queryKey: getVoiceoverQueryKey(voiceoverId),
  });

  // Also invalidate the list
  queryClient.invalidateQueries({
    queryKey: getVoiceoversListQueryKey(),
  });
}

export function handleEntityChange(
  event: EntityChangeEvent,
  queryClient: QueryClient,
): void {
  const { entityType, changeType, entityId } = event;

  switch (entityType) {
    case 'podcast':
      queryClient.invalidateQueries({
        queryKey: getPodcastQueryKey(entityId),
      });
      if (changeType === 'insert' || changeType === 'delete') {
        queryClient.invalidateQueries({
          queryKey: getPodcastsListQueryKey(),
        });
      }
      break;

    case 'document':
      queryClient.invalidateQueries({
        queryKey: getDocumentQueryKey(entityId),
      });
      if (changeType === 'insert' || changeType === 'delete') {
        queryClient.invalidateQueries({
          queryKey: getDocumentsListQueryKey(),
        });
      }
      break;

    case 'voiceover':
      queryClient.invalidateQueries({
        queryKey: getVoiceoverQueryKey(entityId),
      });
      if (changeType === 'insert' || changeType === 'delete') {
        queryClient.invalidateQueries({
          queryKey: getVoiceoversListQueryKey(),
        });
      }
      break;
  }
}
