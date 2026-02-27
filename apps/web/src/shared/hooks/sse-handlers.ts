import { toast } from 'sonner';
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
import { getActivityListQueryKey } from '@/features/admin/hooks';

/** Module-level navigate callback, set by useSSE hook. */
let navigateToPath: ((path: string) => void) | null = null;

export function setNavigateFn(fn: (path: string) => void): void {
  navigateToPath = fn;
}

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

const getInfographicVersionsQueryKey = (infographicId: string) =>
  apiClient.infographics.listVersions.queryOptions({
    input: { id: infographicId },
  }).queryKey;

const entityQueryKeys = {
  podcast: { get: getPodcastQueryKey, list: getPodcastsListQueryKey },
  document: { get: getDocumentQueryKey, list: getDocumentsListQueryKey },
  voiceover: { get: getVoiceoverQueryKey, list: getVoiceoversListQueryKey },
  infographic: {
    get: getInfographicQueryKey,
    list: getInfographicsListQueryKey,
  },
} as const;

/**
 * Check if the user is currently viewing a specific entity's detail page.
 * Uses pathname matching to avoid double-notification.
 */
function isViewingEntity(entityPath: string, entityId: string): boolean {
  return window.location.pathname === `/${entityPath}/${entityId}`;
}

/**
 * Try to get the entity title from the query cache.
 */
function getCachedTitle(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
): string | null {
  const data = queryClient.getQueryData<{ title?: string }>(queryKey);
  return data?.title ?? null;
}

interface NotifyOptions {
  entityType: string;
  entityId: string;
  entityPath: string;
  status: 'completed' | 'failed';
  error?: string;
  title?: string;
  queryClient: QueryClient;
}

function notifyJobCompletion({
  entityType,
  entityId,
  entityPath,
  status,
  error,
  title: providedTitle,
  queryClient,
}: NotifyOptions): void {
  // Don't notify if user is already viewing this entity
  if (isViewingEntity(entityPath, entityId)) return;

  const queryKeyFn =
    entityQueryKeys[entityType as keyof typeof entityQueryKeys]?.get;
  const title =
    providedTitle ??
    (queryKeyFn ? getCachedTitle(queryClient, queryKeyFn(entityId)) : null);

  const label = entityType.charAt(0).toUpperCase() + entityType.slice(1);

  const path = `/${entityPath}/${entityId}`;
  const viewAction = navigateToPath
    ? {
        action: {
          label: 'View',
          onClick: () => navigateToPath!(path),
        },
      }
    : {};

  if (status === 'completed') {
    const message = title
      ? `${label} "${title}" is ready`
      : `${label} is ready`;
    toast.success(message, viewAction);
  } else {
    const message = title
      ? `${label} "${title}" generation failed`
      : `${label} generation failed`;
    toast.error(error || message, viewAction);
  }
}

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

  // Notify on final completion (generate-podcast covers full pipeline)
  if (jobType === 'generate-podcast' && podcastId) {
    const notify = (title?: string) =>
      notifyJobCompletion({
        entityType: 'podcast',
        entityId: podcastId,
        entityPath: 'podcasts',
        status: event.status,
        error: event.error,
        title,
        queryClient,
      });

    queryClient
      .fetchQuery(
        apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }),
      )
      .then((data) => notify(data?.title))
      .catch(() => notify());
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

  const notify = (title?: string) =>
    notifyJobCompletion({
      entityType: 'voiceover',
      entityId: voiceoverId,
      entityPath: 'voiceovers',
      status: event.status,
      error: event.error,
      title,
      queryClient,
    });

  queryClient
    .fetchQuery(
      apiClient.voiceovers.get.queryOptions({ input: { id: voiceoverId } }),
    )
    .then((data) => notify(data?.title))
    .catch(() => notify());
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

  // Versions are rendered in the workbench timeline.
  queryClient.invalidateQueries({
    queryKey: getInfographicVersionsQueryKey(infographicId),
  });

  const notify = (title?: string) =>
    notifyJobCompletion({
      entityType: 'infographic',
      entityId: infographicId,
      entityPath: 'infographics',
      status: event.status,
      error: event.error,
      title,
      queryClient,
    });

  queryClient
    .fetchQuery(
      apiClient.infographics.get.queryOptions({ input: { id: infographicId } }),
    )
    .then((data) => notify(data?.title))
    .catch(() => notify());
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

  const notify = (title?: string) =>
    notifyJobCompletion({
      entityType: 'document',
      entityId: documentId,
      entityPath: 'documents',
      status: event.status,
      error: event.error,
      title,
      queryClient,
    });

  queryClient
    .fetchQuery(
      apiClient.documents.get.queryOptions({ input: { id: documentId } }),
    )
    .then((data) => notify(data?.title))
    .catch(() => notify());
}

export function handleActivityLogged(
  _event: ActivityLoggedEvent,
  queryClient: QueryClient,
): void {
  // Scope invalidation to the canonical admin activity list key prefix.
  const activityListQueryKeyScope = getActivityListQueryKey().slice(0, 1);

  queryClient.invalidateQueries({
    queryKey: activityListQueryKeyScope,
  });
}

export function handleEntityChange(
  event: EntityChangeEvent,
  queryClient: QueryClient,
): void {
  const { entityType, changeType, entityId } = event;
  const keys = entityQueryKeys[entityType];
  if (!keys) return;

  queryClient.invalidateQueries({ queryKey: keys.get(entityId) });

  if (entityType === 'infographic') {
    queryClient.invalidateQueries({
      queryKey: getInfographicVersionsQueryKey(entityId),
    });
  }

  if (changeType === 'insert' || changeType === 'delete') {
    queryClient.invalidateQueries({ queryKey: keys.list() });
  }
}
