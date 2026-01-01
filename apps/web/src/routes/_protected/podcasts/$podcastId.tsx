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
import {
  useScriptEditor,
  usePodcastSettings,
  useOptimisticFullGeneration,
  useOptimisticSaveChanges,
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

  const { data: podcast, isPending } = useQuery(
    apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }),
  );

  // Script editing state
  const scriptEditor = useScriptEditor({
    podcastId,
    initialSegments: [...(podcast?.activeVersion?.segments ?? [])],
  });

  // Settings state management
  const settings = usePodcastSettings({ podcast });

  // Generation and save mutations with optimistic updates
  const generateMutation = useOptimisticFullGeneration(podcastId);
  const saveChangesMutation = useOptimisticSaveChanges(podcastId);

  const hasAnyChanges = scriptEditor.hasChanges || settings.hasChanges;

  // Combined save handler for script and voice changes
  const handleSave = useCallback(() => {
    if (!podcast || saveChangesMutation.isPending) return;

    const segmentsToSave = scriptEditor.hasChanges ? scriptEditor.segments : undefined;
    saveChangesMutation.mutate(
      {
        id: podcast.id,
        segments: segmentsToSave,
        hostVoice: settings.hasChanges ? settings.hostVoice : undefined,
        coHostVoice: settings.hasChanges ? settings.coHostVoice : undefined,
      },
      {
        onSuccess: () => {
          // Reset state after successful save
          if (segmentsToSave) {
            scriptEditor.resetToSegments(segmentsToSave);
          }
          if (settings.hasChanges) {
            settings.discardChanges();
          }
          toast.success('Saving changes and regenerating audio...');
        },
      },
    );
  }, [podcast, scriptEditor, settings, saveChangesMutation]);

  // Keyboard shortcut: Cmd/Ctrl+S to save
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasAnyChanges) {
          handleSave();
        }
      }
    },
    [hasAnyChanges, handleSave],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Block navigation if there are unsaved changes
  useBlocker({
    shouldBlockFn: () => hasAnyChanges,
    withResolver: true,
  });

  // Browser beforeunload warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasAnyChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasAnyChanges]);

  const deleteMutation = useMutation(
    apiClient.podcasts.delete.mutationOptions({
      onSuccess: () => {
        toast.success('Podcast deleted');
        navigate({ to: '/podcasts' });
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to delete podcast');
      },
    }),
  );

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
  const isPendingGeneration = generateMutation.isPending;

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
          disabled={podcast.activeVersion?.status !== 'ready'}
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
          isGenerating={isGenerating || isPendingGeneration}
          isPendingGeneration={isPendingGeneration}
          settings={settings}
        />
      }
      actionBar={
        <GlobalActionBar
          status={podcast.activeVersion?.status}
          isGenerating={isGenerating}
          hasChanges={hasAnyChanges}
          isSaving={saveChangesMutation.isPending}
          onSave={handleSave}
          onGenerate={() => generateMutation.mutate({ id: podcast.id })}
          disabled={isGenerating}
        />
      }
    />
  );
}
