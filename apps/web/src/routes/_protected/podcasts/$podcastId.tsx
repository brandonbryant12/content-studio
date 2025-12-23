import { Spinner } from '@repo/ui/components/spinner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createFileRoute,
  Link,
  useNavigate,
  useBlocker,
} from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
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
import { useScriptEditor, useVersionViewer } from '@/hooks';

type PodcastFull = RouterOutput['podcasts']['get'];

export const Route = createFileRoute('/_protected/podcasts/$podcastId')({
  validateSearch: (search: Record<string, unknown>) => ({
    scriptId:
      typeof search.scriptId === 'string' ? search.scriptId : undefined,
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

  // Version viewing state
  const versionViewer = useVersionViewer({
    podcastId,
    activeScript: podcast?.script ?? null,
    selectedScriptId,
  });

  const scriptEditor = useScriptEditor({
    podcastId,
    initialSegments: podcast?.script?.segments ?? [],
  });

  // Reset segments when podcast data changes (e.g., after generation)
  useEffect(() => {
    if (podcast?.script?.segments) {
      scriptEditor.resetToSegments(podcast.script.segments);
    }
  }, [podcast?.script?.segments]);

  // Restore mutation for "Set as Current" action
  const restoreMutation = useMutation(
    apiClient.podcasts.restoreScriptVersion.mutationOptions({
      onSuccess: async () => {
        toast.success('Script version restored');
        versionViewer.clearSelection();
        await invalidateQueries('podcasts');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to restore version');
      },
    }),
  );

  const handleSetAsCurrent = () => {
    if (versionViewer.viewedScript && versionViewer.isViewingHistory) {
      restoreMutation.mutate({
        id: podcastId,
        scriptId: versionViewer.viewedScript.id,
      });
    }
  };

  // Keyboard shortcut: Cmd/Ctrl+S to save (only when editable)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        // Only save if viewing active version (editable)
        if (
          versionViewer.isEditable &&
          scriptEditor.hasChanges &&
          !scriptEditor.isSaving
        ) {
          scriptEditor.saveChanges();
        }
      }
    },
    [scriptEditor, versionViewer.isEditable],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Block navigation if there are unsaved changes (only when editing active version)
  useBlocker({
    shouldBlockFn: () => versionViewer.isEditable && scriptEditor.hasChanges,
    withResolver: true,
  });

  // Browser beforeunload warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (versionViewer.isEditable && scriptEditor.hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [scriptEditor.hasChanges, versionViewer.isEditable]);

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

  const generateScriptMutation = useMutation(
    apiClient.podcasts.generateScript.mutationOptions({
      onSuccess: async () => {
        toast.success('Script generation started');
        await invalidateQueries('podcasts');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to start script generation');
      },
    }),
  );

  const generateAudioMutation = useMutation(
    apiClient.podcasts.generateAudio.mutationOptions({
      onSuccess: async () => {
        toast.success('Audio generation started');
        await invalidateQueries('podcasts');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to start audio generation');
      },
    }),
  );

  const generateAllMutation = useMutation(
    apiClient.podcasts.generate.mutationOptions({
      onSuccess: async () => {
        toast.success('Generation started');
        await invalidateQueries('podcasts');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to start generation');
      },
    }),
  );

  // Optimistic regeneration mutation - used when settings are saved
  const qc = useQueryClient();
  const podcastQueryKey = apiClient.podcasts.get.queryOptions({
    input: { id: podcastId },
  }).queryKey;

  const regenerateMutation = useMutation(
    apiClient.podcasts.generate.mutationOptions({
      onMutate: async () => {
        // Cancel any outgoing refetches
        await qc.cancelQueries({ queryKey: podcastQueryKey });

        // Snapshot the previous value
        const previousPodcast = qc.getQueryData<PodcastFull>(podcastQueryKey);

        // Optimistically update to generating_script
        if (previousPodcast) {
          qc.setQueryData<PodcastFull>(podcastQueryKey, {
            ...previousPodcast,
            status: 'generating_script',
          });
        }

        return { previousPodcast };
      },
      onError: (_err, _vars, context) => {
        // Rollback on error
        if (context?.previousPodcast) {
          qc.setQueryData(podcastQueryKey, context.previousPodcast);
        }
        toast.error('Failed to start generation');
      },
      onSettled: () => {
        // Always refetch to ensure sync
        invalidateQueries('podcasts');
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

  // Determine which segments to display
  const displaySegments = versionViewer.isViewingHistory
    ? versionViewer.viewedScript?.segments ?? []
    : scriptEditor.segments;

  const displaySummary = versionViewer.isViewingHistory
    ? versionViewer.viewedScript?.summary ?? null
    : podcast.script?.summary ?? null;

  return (
    <WorkbenchLayout
      podcast={podcast}
      onDelete={() => deleteMutation.mutate({ id: podcast.id })}
      isDeleting={deleteMutation.isPending}
      leftPanel={
        <ScriptPanel
          segments={displaySegments}
          summary={displaySummary}
          hasChanges={scriptEditor.hasChanges}
          isSaving={scriptEditor.isSaving}
          readOnly={versionViewer.isViewingHistory}
          viewingVersion={
            versionViewer.isViewingHistory
              ? versionViewer.viewedScript?.version
              : undefined
          }
          onUpdateSegment={scriptEditor.updateSegment}
          onRemoveSegment={scriptEditor.removeSegment}
          onReorderSegments={scriptEditor.reorderSegments}
          onAddSegment={scriptEditor.addSegment}
          onSave={scriptEditor.saveChanges}
          onDiscard={scriptEditor.discardChanges}
          onSetAsCurrent={handleSetAsCurrent}
          isRestoring={restoreMutation.isPending}
        />
      }
      rightPanel={
        <ConfigPanel
          podcast={podcast}
          hasUnsavedChanges={scriptEditor.hasChanges}
          isSaving={scriptEditor.isSaving}
          onSave={scriptEditor.saveChanges}
          onGenerateScript={() =>
            generateScriptMutation.mutate({ id: podcast.id })
          }
          onGenerateAudio={() =>
            generateAudioMutation.mutate({ id: podcast.id })
          }
          onGenerateAll={() => generateAllMutation.mutate({ id: podcast.id })}
          isGenerating={isGenerating || regenerateMutation.isPending}
          pendingAction={pendingAction}
          selectedScriptId={selectedScriptId}
          onSelectVersion={versionViewer.selectVersion}
          onRegenerate={() => regenerateMutation.mutate({ id: podcast.id })}
          isRegenerating={regenerateMutation.isPending}
          isViewingHistory={versionViewer.isViewingHistory}
          viewingVersion={versionViewer.viewedScript?.version}
          onSetAsCurrent={handleSetAsCurrent}
          isRestoring={restoreMutation.isPending}
        />
      }
    />
  );
}
