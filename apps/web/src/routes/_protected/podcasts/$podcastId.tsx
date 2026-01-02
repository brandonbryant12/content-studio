import { Spinner } from '@repo/ui/components/spinner';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  Link,
  useNavigate,
  useBlocker,
} from '@tanstack/react-router';
import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';
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
  useDocumentSelection,
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

  // Document selection state management
  const documentSelection = useDocumentSelection({
    initialDocuments: [...(podcast?.documents ?? [])],
  });

  // Generation and save mutations with optimistic updates
  const generateMutation = useOptimisticFullGeneration(podcastId);
  const saveChangesMutation = useOptimisticSaveChanges(podcastId);

  // Update mutation for saving documents before full regeneration
  const updateMutation = useMutation(
    apiClient.podcasts.update.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to update podcast'));
      },
    }),
  );

  const hasAnyChanges =
    scriptEditor.hasChanges || settings.hasChanges || documentSelection.hasChanges;

  // Combined save handler for script, voice, and document changes
  const handleSave = useCallback(async () => {
    if (!podcast || saveChangesMutation.isPending || updateMutation.isPending || generateMutation.isPending) return;

    // If documents changed, we need full regeneration (script + audio)
    if (documentSelection.hasChanges) {
      try {
        // First, save documents and any settings changes
        await updateMutation.mutateAsync({
          id: podcast.id,
          documentIds: documentSelection.documentIds,
          hostVoice: settings.hostVoice,
          coHostVoice: settings.coHostVoice,
          targetDurationMinutes: settings.targetDuration,
          promptInstructions: settings.instructions || undefined,
        });

        // Then trigger full regeneration
        generateMutation.mutate(
          { id: podcast.id },
          {
            onSuccess: () => {
              toast.success('Regenerating podcast with new sources...');
            },
          },
        );
      } catch {
        // Error already handled by mutation
      }
      return;
    }

    // No document changes - just save script/voice and regenerate audio
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
          // Reset script editor to saved segments so hasChanges becomes false
          if (segmentsToSave) {
            scriptEditor.resetToSegments(segmentsToSave);
          }
          // Don't call settings.discardChanges() - local state already has correct values
          // When podcast refetches, hasChanges will be false since local matches server
          toast.success('Saving changes and regenerating audio...');
        },
      },
    );
  }, [podcast, scriptEditor, settings, documentSelection, saveChangesMutation, updateMutation, generateMutation]);

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
        queryClient.invalidateQueries({ queryKey: ['podcasts'] });
        toast.success('Podcast deleted');
        navigate({ to: '/podcasts' });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to delete podcast'));
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
  if (isSetupMode(podcast)) {
    return <SetupWizard podcast={podcast} />;
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
          documentSelection={documentSelection}
        />
      }
      actionBar={
        <GlobalActionBar
          status={podcast.activeVersion?.status}
          isGenerating={isGenerating}
          hasChanges={hasAnyChanges}
          isSaving={saveChangesMutation.isPending || updateMutation.isPending}
          onSave={handleSave}
          onGenerate={() => generateMutation.mutate({ id: podcast.id })}
          disabled={isGenerating}
        />
      }
    />
  );
}
