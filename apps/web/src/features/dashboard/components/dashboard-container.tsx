import { useCallback, useState } from 'react';
import { DashboardPage } from './dashboard-page';
import {
  useDocumentsOrdered,
  useCreateFromUrl,
} from '@/features/documents/hooks';
import {
  useInfographicList,
  useCreateInfographic,
} from '@/features/infographics/hooks';
import {
  useCreatePodcast,
  usePodcastsOrdered,
} from '@/features/podcasts/hooks';
import {
  useVoiceoversOrdered,
  useCreateVoiceover,
} from '@/features/voiceovers/hooks';
import { QueryErrorFallback } from '@/shared/components/query-error-fallback';
import { useOnboardingDismissed } from '@/shared/hooks/use-onboarding-dismissed';

export function DashboardContainer() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [researchDialogOpen, setResearchDialogOpen] = useState(false);
  const { isDismissed, dismiss } = useOnboardingDismissed();

  const {
    data: documents = [],
    isLoading: docsLoading,
    isError: docsError,
    error: docsErrorObj,
    refetch: refetchDocs,
  } = useDocumentsOrdered({
    orderBy: 'desc',
  });
  const {
    data: podcasts = [],
    isLoading: podcastsLoading,
    isError: podcastsError,
    error: podcastsErrorObj,
    refetch: refetchPodcasts,
  } = usePodcastsOrdered({
    orderBy: 'desc',
  });
  const {
    data: voiceovers = [],
    isLoading: voiceoversLoading,
    isError: voiceoversError,
    error: voiceoversErrorObj,
    refetch: refetchVoiceovers,
  } = useVoiceoversOrdered({ orderBy: 'desc' });
  const {
    data: infographics = [],
    isLoading: infographicsLoading,
    isError: infographicsError,
    error: infographicsErrorObj,
    refetch: refetchInfographics,
  } = useInfographicList();

  const createPodcast = useCreatePodcast();
  const createVoiceover = useCreateVoiceover();
  const createInfographic = useCreateInfographic();
  const createFromUrlMutation = useCreateFromUrl();

  const handleCreateFromUrl = useCallback(
    (url: string, title?: string) => {
      createFromUrlMutation.mutate(
        { url, title },
        {
          onSuccess: () => {
            setUrlDialogOpen(false);
          },
        },
      );
    },
    [createFromUrlMutation],
  );

  const anyError =
    docsError || podcastsError || voiceoversError || infographicsError;

  if (anyError) {
    const firstError =
      docsErrorObj ??
      podcastsErrorObj ??
      voiceoversErrorObj ??
      infographicsErrorObj;
    return (
      <QueryErrorFallback
        error={firstError}
        fallbackMessage="Failed to load dashboard"
        onRetry={() => {
          refetchDocs();
          refetchPodcasts();
          refetchVoiceovers();
          refetchInfographics();
        }}
      />
    );
  }

  const docCount = documents.length;
  const podcastCount = podcasts.length;
  const voiceoverCount = voiceovers.length;
  const infographicCount = infographics.length;

  const totalCount =
    docCount + podcastCount + voiceoverCount + infographicCount;
  const anyLoading =
    docsLoading || podcastsLoading || voiceoversLoading || infographicsLoading;
  const showOnboarding = totalCount === 0 && !anyLoading && !isDismissed;

  return (
    <DashboardPage
      counts={{
        documents: docCount,
        podcasts: podcastCount,
        voiceovers: voiceoverCount,
        infographics: infographicCount,
      }}
      onboarding={{
        show: showOnboarding,
        onDismiss: dismiss,
      }}
      loading={{
        documents: docsLoading,
        podcasts: podcastsLoading,
        voiceovers: voiceoversLoading,
        infographics: infographicsLoading,
      }}
      recent={{
        documents: documents.slice(0, 5),
        podcasts: podcasts.slice(0, 5),
        voiceovers: voiceovers.slice(0, 4),
        infographics: infographics.slice(0, 4),
      }}
      createActions={{
        onCreatePodcast: () =>
          createPodcast.mutate({
            title: 'Untitled Podcast',
            format: 'conversation',
          }),
        isPodcastPending: createPodcast.isPending,
        onCreateVoiceover: () =>
          createVoiceover.mutate({ title: 'Untitled Voiceover' }),
        isVoiceoverPending: createVoiceover.isPending,
        onCreateInfographic: (payload) => createInfographic.mutate(payload),
        isInfographicPending: createInfographic.isPending,
      }}
      documentDialogs={{
        uploadOpen,
        onUploadOpenChange: setUploadOpen,
        urlDialogOpen,
        onUrlDialogOpenChange: setUrlDialogOpen,
        researchDialogOpen,
        onResearchDialogOpenChange: setResearchDialogOpen,
        onCreateFromUrl: handleCreateFromUrl,
        isCreateFromUrlPending: createFromUrlMutation.isPending,
      }}
    />
  );
}
