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
} from './-components/workbench';
import { isGeneratingStatus } from './-constants/status';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';
import { queryClient } from '@/clients/queryClient';
import {
  usePodcastWorkbench,
  useOptimisticScriptGeneration,
  useOptimisticAudioGeneration,
  useOptimisticFullGeneration,
} from '@/hooks';

export const Route = createFileRoute('/_protected/podcasts/$podcastId')({
  validateSearch: (search: Record<string, unknown>) => ({
    scriptId: typeof search.scriptId === 'string' ? search.scriptId : undefined,
  }),
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      apiClient.podcasts.get.queryOptions({ input: { id: params.podcastId } }),
    ),
  component: PodcastWorkbench,
});

function PodcastWorkbench() {
  const { podcastId } = Route.useParams();
  const { scriptId: selectedScriptId } = Route.useSearch();
  const navigate = useNavigate();
  const [setupSkipped, setSetupSkipped] = useState(false);

  const { data: podcast, isPending } = useQuery({
    ...apiClient.podcasts.get.queryOptions({ input: { id: podcastId } }),
    refetchInterval: (query) => {
      // Poll during generation
      const status = query.state.data?.status;
      if (status === 'generating_script' || status === 'generating_audio') {
        return 2000;
      }
      return false;
    },
  });

  // Unified workbench state management
  const workbench = usePodcastWorkbench({
    podcastId,
    podcast,
    selectedScriptId,
  });

  // Restore mutation for "Set as Current" action
  const restoreMutation = useMutation(
    apiClient.podcasts.restoreScriptVersion.mutationOptions({
      onSuccess: async () => {
        toast.success('Script version restored');
        workbench.clearSelection();
        await invalidateQueries('podcasts');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to restore version');
      },
    }),
  );

  const handleSetAsCurrent = () => {
    if (workbench.viewedScript && workbench.isViewingHistory) {
      restoreMutation.mutate({
        id: podcastId,
        scriptId: workbench.viewedScript.id,
      });
    }
  };

  // Keyboard shortcut: Cmd/Ctrl+S to save (only when editable)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        // Only save if in editing mode
        if (
          workbench.isEditing &&
          workbench.editState.hasChanges &&
          !workbench.editState.isSaving
        ) {
          workbench.editState.saveChanges();
        }
      }
    },
    [workbench],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Block navigation if there are unsaved changes (only when editing)
  useBlocker({
    shouldBlockFn: () => workbench.isEditing && workbench.editState.hasChanges,
    withResolver: true,
  });

  // Browser beforeunload warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (workbench.isEditing && workbench.editState.hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [workbench.editState.hasChanges, workbench.isEditing]);

  const deleteMutation = useMutation(
    apiClient.podcasts.delete.mutationOptions({
      onSuccess: async () => {
        toast.success('Podcast deleted');
        navigate({ to: '/podcasts' });
        await invalidateQueries('podcasts');
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

  const isGenerating = isGeneratingStatus(podcast.status);

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

  return (
    <WorkbenchLayout
      podcast={podcast}
      onDelete={() => deleteMutation.mutate({ id: podcast.id })}
      isDeleting={deleteMutation.isPending}
      leftPanel={
        <ScriptPanel
          segments={workbench.displaySegments}
          summary={workbench.displaySummary}
          hasChanges={workbench.editState.hasChanges}
          isSaving={workbench.editState.isSaving}
          readOnly={!workbench.isEditing}
          viewingVersion={workbench.viewedVersion}
          onUpdateSegment={workbench.editState.updateSegment}
          onRemoveSegment={workbench.editState.removeSegment}
          onReorderSegments={workbench.editState.reorderSegments}
          onAddSegment={workbench.editState.addSegment}
          onSave={workbench.editState.saveChanges}
          onDiscard={workbench.editState.discardChanges}
          onSetAsCurrent={handleSetAsCurrent}
          isRestoring={restoreMutation.isPending}
        />
      }
      rightPanel={
        <ConfigPanel
          podcast={podcast}
          hasUnsavedChanges={workbench.editState.hasChanges}
          isSaving={workbench.editState.isSaving}
          onSave={workbench.editState.saveChanges}
          onGenerateScript={() => {
            workbench.clearSelection();
            generateScriptMutation.mutate({ id: podcast.id });
          }}
          onGenerateAudio={() => {
            workbench.clearSelection();
            generateAudioMutation.mutate({ id: podcast.id });
          }}
          onGenerateAll={() => {
            workbench.clearSelection();
            generateAllMutation.mutate({ id: podcast.id });
          }}
          isGenerating={isGenerating || generateAllMutation.isPending}
          pendingAction={pendingAction}
          selectedScriptId={selectedScriptId}
          onSelectVersion={workbench.selectVersion}
          onRegenerate={() => {
            workbench.clearSelection();
            generateAllMutation.mutate({ id: podcast.id });
          }}
          isRegenerating={generateAllMutation.isPending}
          isViewingHistory={workbench.isViewingHistory}
          viewingVersion={workbench.viewedVersion}
          onSetAsCurrent={handleSetAsCurrent}
          isRestoring={restoreMutation.isPending}
        />
      }
    />
  );
}
