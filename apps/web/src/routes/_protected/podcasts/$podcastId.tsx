import { Spinner } from '@repo/ui/components/spinner';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  Link,
  useNavigate,
  useBlocker,
} from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { SetupWizard, isSetupMode } from './-components/setup';
import {
  WorkbenchLayout,
  ScriptPanel,
  ConfigPanel,
  GlobalActionBar,
} from './-components/workbench';
import { isGeneratingStatus } from './-constants/status';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { podcastUtils } from '@/db';
import {
  useScriptEditor,
  usePodcastSettings,
  useOptimisticScriptGeneration,
  useOptimisticAudioGeneration,
  useOptimisticFullGeneration,
} from '@/hooks';

export const Route = createFileRoute('/_protected/podcasts/$podcastId')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      apiClient.podcasts.get.queryOptions({ input: { id: params.podcastId } }),
    ),
  component: PodcastWorkbench,
});

function PodcastWorkbench() {
  const { podcastId } = Route.useParams();
  const navigate = useNavigate();
  const [setupSkipped, setSetupSkipped] = useState(false);

  // No polling needed - SSE will trigger refetch when job completes
  const { data: podcast, isPending } = useQuery(
    apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }),
  );

  // Script editing state
  const scriptEditor = useScriptEditor({
    podcastId,
    initialSegments: podcast?.activeVersion?.segments ?? [],
  });

  // Settings state management
  const settings = usePodcastSettings({ podcast });

  // Keyboard shortcut: Cmd/Ctrl+S to save
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (scriptEditor.hasChanges && !scriptEditor.isSaving) {
          scriptEditor.saveChanges();
        }
      }
    },
    [scriptEditor],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Block navigation if there are unsaved changes
  useBlocker({
    shouldBlockFn: () => scriptEditor.hasChanges,
    withResolver: true,
  });

  // Browser beforeunload warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (scriptEditor.hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [scriptEditor.hasChanges]);

  const deleteMutation = useMutation(
    apiClient.podcasts.delete.mutationOptions({
      onSuccess: async () => {
        toast.success('Podcast deleted');
        navigate({ to: '/podcasts' });
        await podcastUtils.refetch();
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to delete podcast');
      },
    }),
  );

  // Generation mutations with optimistic updates
  const generateScriptMutation = useOptimisticScriptGeneration(podcastId);
  const generateAudioMutation = useOptimisticAudioGeneration(podcastId);
  const generateAllMutation = useOptimisticFullGeneration(podcastId);

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  if (!podcast) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Podcast not found
        </h2>
        <Link
          to="/podcasts"
          className="mt-4 text-violet-600 dark:text-violet-400 hover:underline"
        >
          Back to Podcasts
        </Link>
      </div>
    );
  }

  const isGenerating = isGeneratingStatus(podcast.activeVersion?.status);

  // Track which specific generation action is pending
  const pendingAction = generateScriptMutation.isPending
    ? 'script'
    : generateAudioMutation.isPending
      ? 'audio'
      : generateAllMutation.isPending
        ? 'all'
        : null;

  // Show setup wizard for new podcasts that haven't been configured yet
  if (isSetupMode(podcast) && !setupSkipped) {
    return (
      <SetupWizard podcast={podcast} onSkip={() => setSetupSkipped(true)} />
    );
  }

  // Audio from active version
  const displayAudio = podcast.activeVersion?.audioUrl
    ? {
        url: podcast.activeVersion.audioUrl,
        duration: podcast.activeVersion.duration ?? null,
      }
    : null;

  return (
    <WorkbenchLayout
      podcast={podcast}
      onDelete={() => deleteMutation.mutate({ id: podcast.id })}
      isDeleting={deleteMutation.isPending}
      leftPanel={
        <ScriptPanel
          segments={scriptEditor.segments}
          summary={podcast.activeVersion?.summary ?? null}
          hasChanges={scriptEditor.hasChanges}
          isSaving={scriptEditor.isSaving}
          onUpdateSegment={scriptEditor.updateSegment}
          onRemoveSegment={scriptEditor.removeSegment}
          onReorderSegments={scriptEditor.reorderSegments}
          onAddSegment={scriptEditor.addSegment}
          onDiscard={scriptEditor.discardChanges}
        />
      }
      rightPanel={
        <ConfigPanel
          podcast={podcast}
          displayAudio={displayAudio}
          isGenerating={isGenerating || generateAllMutation.isPending}
          pendingAction={pendingAction}
          settings={settings}
        />
      }
      actionBar={
        <GlobalActionBar
          status={podcast.activeVersion?.status}
          hasScript={!!podcast.activeVersion}
          isGenerating={isGenerating}
          pendingAction={pendingAction}
          hasScriptChanges={scriptEditor.hasChanges}
          isScriptSaving={scriptEditor.isSaving}
          onSaveScript={scriptEditor.saveChanges}
          hasSettingsChanges={settings.hasChanges}
          isSettingsSaving={settings.isSaving}
          onSaveSettings={settings.saveSettings}
          onGenerateScript={() => generateScriptMutation.mutate({ id: podcast.id })}
          onGenerateAudio={() => generateAudioMutation.mutate({ id: podcast.id })}
          onGenerateAll={() => generateAllMutation.mutate({ id: podcast.id })}
          disabled={isGenerating}
        />
      }
    />
  );
}
