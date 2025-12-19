import { useEffect, useCallback } from 'react';
import { Spinner } from '@repo/ui/components/spinner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate, useBlocker } from '@tanstack/react-router';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';
import { queryClient } from '@/clients/queryClient';
import { useScriptEditor } from '@/hooks';
import { isGeneratingStatus } from './-constants/status';
import { WorkbenchLayout, ScriptPanel, ConfigPanel } from './-components/workbench';

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

  return (
    <WorkbenchLayout
      podcast={podcast}
      onDelete={() => deleteMutation.mutate({ id: podcast.id })}
      isDeleting={deleteMutation.isPending}
      leftPanel={
        <ScriptPanel
          segments={scriptEditor.segments}
          summary={podcast.script?.summary ?? null}
          hasChanges={scriptEditor.hasChanges}
          isSaving={scriptEditor.isSaving}
          onUpdateSegment={scriptEditor.updateSegment}
          onRemoveSegment={scriptEditor.removeSegment}
          onReorderSegments={scriptEditor.reorderSegments}
          onAddSegment={scriptEditor.addSegment}
          onSave={scriptEditor.saveChanges}
          onDiscard={scriptEditor.discardChanges}
        />
      }
      rightPanel={
        <ConfigPanel
          podcast={podcast}
          hasUnsavedChanges={scriptEditor.hasChanges}
          isSaving={scriptEditor.isSaving}
          onSave={scriptEditor.saveChanges}
          onGenerateScript={() => generateScriptMutation.mutate({ id: podcast.id })}
          onGenerateAudio={() => generateAudioMutation.mutate({ id: podcast.id })}
          onGenerateAll={() => generateAllMutation.mutate({ id: podcast.id })}
          isGenerating={isGenerating}
          pendingAction={pendingAction}
        />
      }
    />
  );
}
