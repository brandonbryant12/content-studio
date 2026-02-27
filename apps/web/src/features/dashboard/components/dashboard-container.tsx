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
  useOptimisticCreate as useCreatePodcast,
  usePodcastsOrdered,
} from '@/features/podcasts/hooks';
import {
  useVoiceoversOrdered,
  useCreateVoiceover,
} from '@/features/voiceovers/hooks';
import { useOnboardingDismissed } from '@/shared/hooks/use-onboarding-dismissed';

export function DashboardContainer() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [researchDialogOpen, setResearchDialogOpen] = useState(false);
  const { isDismissed, dismiss } = useOnboardingDismissed();

  const { data: documents, isLoading: docsLoading } = useDocumentsOrdered({
    orderBy: 'desc',
  });
  const { data: podcasts, isLoading: podcastsLoading } = usePodcastsOrdered({
    orderBy: 'desc',
  });
  const { data: voiceovers, isLoading: voiceoversLoading } =
    useVoiceoversOrdered({ orderBy: 'desc' });
  const { data: infographics, isLoading: infographicsLoading } =
    useInfographicList();

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

  const docCount = documents?.length ?? 0;
  const podcastCount = podcasts?.length ?? 0;
  const voiceoverCount = voiceovers?.length ?? 0;
  const infographicCount = infographics?.length ?? 0;

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
        documents: documents?.slice(0, 5) ?? [],
        podcasts: recentPodcasts(podcasts),
        voiceovers: recentVoiceovers(voiceovers),
        infographics: recentInfographics(infographics),
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

/* ------------------------------------------------------------------ */
/*  Helpers — slice recent items from full lists                      */
/* ------------------------------------------------------------------ */

function recentPodcasts(
  podcasts:
    | ReadonlyArray<{ id: string; title: string; duration: number | null }>
    | undefined,
) {
  return podcasts?.slice(0, 5) ?? [];
}

function recentVoiceovers(
  voiceovers:
    | ReadonlyArray<{
        id: string;
        title: string;
        duration: number | null;
        voiceName: string | null;
      }>
    | undefined,
) {
  return voiceovers?.slice(0, 4) ?? [];
}

function recentInfographics(
  infographics:
    | ReadonlyArray<{ id: string; title: string; format: string }>
    | undefined,
) {
  return infographics?.slice(0, 4) ?? [];
}
