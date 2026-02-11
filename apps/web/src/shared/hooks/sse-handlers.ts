import type {
  JobCompletionEvent,
  VoiceoverJobCompletionEvent,
  InfographicJobCompletionEvent,
  DocumentJobCompletionEvent,
  EntityChangeEvent,
  ActivityLoggedEvent,
} from '@repo/api/contracts';
import type { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/clients/apiClient';

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

const getInfographicQueryKey = (infographicId: string) =>
  apiClient.infographics.get.queryOptions({ input: { id: infographicId } })
    .queryKey;

const getInfographicsListQueryKey = () =>
  apiClient.infographics.list.queryOptions({ input: {} }).queryKey;

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

export function handleInfographicJobCompletion(
  event: InfographicJobCompletionEvent,
  queryClient: QueryClient,
): void {
  const { infographicId } = event;

  // Invalidate specific infographic
  queryClient.invalidateQueries({
    queryKey: getInfographicQueryKey(infographicId),
  });

  // Also invalidate the list
  queryClient.invalidateQueries({
    queryKey: getInfographicsListQueryKey(),
  });
}

export function handleDocumentJobCompletion(
  event: DocumentJobCompletionEvent,
  queryClient: QueryClient,
): void {
  const { documentId } = event;

  // Invalidate specific document
  queryClient.invalidateQueries({
    queryKey: getDocumentQueryKey(documentId),
  });

  // Also invalidate the list (status changed)
  queryClient.invalidateQueries({
    queryKey: getDocumentsListQueryKey(),
  });
}

export function handleActivityLogged(
  _event: ActivityLoggedEvent,
  queryClient: QueryClient,
): void {
  // Invalidate all admin activity queries so the dashboard auto-refreshes.
  // Uses a broad prefix to catch both ORPC-generated and custom infinite query keys.
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return Array.isArray(key) && key[0] === 'admin';
    },
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

    case 'infographic':
      queryClient.invalidateQueries({
        queryKey: getInfographicQueryKey(entityId),
      });
      if (changeType === 'insert' || changeType === 'delete') {
        queryClient.invalidateQueries({
          queryKey: getInfographicsListQueryKey(),
        });
      }
      break;
  }
}
