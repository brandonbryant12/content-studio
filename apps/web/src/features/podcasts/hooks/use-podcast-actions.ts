import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { toast } from 'sonner';
import type { UsePodcastSettingsReturn } from './use-podcast-settings';
import type { UseScriptEditorReturn } from './use-script-editor';
import type { UseSourceSelectionReturn } from './use-source-selection';
import type { RouterOutput } from '@repo/api/client';
import { isGeneratingStatus } from '../lib/status';
import { useOptimisticGeneration } from './use-optimistic-generation';
import { useOptimisticSaveChanges } from './use-optimistic-save-changes';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

type Podcast = RouterOutput['podcasts']['get'];

interface UsePodcastActionsReturn {
  hasAnyChanges: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  isPendingGeneration: boolean;
  isDeleting: boolean;
  needsFullRegeneration: boolean;
  handleSave: () => Promise<void>;
  handleGenerate: () => void;
  handleDelete: () => void;
}

interface UsePodcastActionsOptions {
  podcastId: string;
  podcast: Podcast;
  scriptEditor: UseScriptEditorReturn;
  settings: UsePodcastSettingsReturn;
  sourceSelection: UseSourceSelectionReturn;
}

export function usePodcastActions({
  podcastId,
  podcast,
  scriptEditor,
  settings,
  sourceSelection,
}: UsePodcastActionsOptions): UsePodcastActionsReturn {
  const navigate = useNavigate();

  const generateMutation = useOptimisticGeneration(podcastId);
  const saveChangesMutation = useOptimisticSaveChanges(podcastId);

  const updateMutation = useMutation(
    apiClient.podcasts.update.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to update podcast'));
      },
    }),
  );

  const deleteMutation = useMutation(
    apiClient.podcasts.delete.mutationOptions({
      onSuccess: () => {
        toast.success('Podcast deleted');
        navigate({ to: '/podcasts' });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to delete podcast'));
      },
    }),
  );

  const hasAnyChanges =
    scriptEditor.hasChanges ||
    settings.hasChanges ||
    sourceSelection.hasChanges;

  const isGenerating = isGeneratingStatus(podcast.status);
  const isPendingGeneration = generateMutation.isPending;
  const isSaving = saveChangesMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const needsFullRegeneration =
    sourceSelection.hasChanges || settings.hasScriptSettingsChanges;

  const handleSave = useCallback(async () => {
    if (
      saveChangesMutation.isPending ||
      updateMutation.isPending ||
      generateMutation.isPending
    ) {
      return;
    }

    if (needsFullRegeneration) {
      try {
        await updateMutation.mutateAsync({
          id: podcast.id,
          sourceIds: sourceSelection.hasChanges
            ? sourceSelection.sourceIds
            : undefined,
          episodePlan: sourceSelection.hasChanges ? null : undefined,
          hostVoice: settings.hostVoice,
          coHostVoice: settings.coHostVoice,
          targetDurationMinutes: settings.targetDuration,
          hostPersonaId: settings.hostPersonaId,
          coHostPersonaId: settings.coHostPersonaId,
        });

        generateMutation.mutate(
          { id: podcast.id },
          {
            onSuccess: () => {
              const message = sourceSelection.hasChanges
                ? 'Regenerating podcast with updated sources...'
                : 'Regenerating podcast with updated settings...';
              toast.success(message);
            },
          },
        );
      } catch {
        return;
      }

      return;
    }

    const segmentsToSave = scriptEditor.hasChanges
      ? scriptEditor.segments
      : undefined;

    saveChangesMutation.mutate(
      {
        id: podcast.id,
        segments: segmentsToSave,
        hostVoice: settings.hasChanges ? settings.hostVoice : undefined,
        coHostVoice: settings.hasChanges ? settings.coHostVoice : undefined,
      },
      {
        onSuccess: () => {
          if (segmentsToSave) {
            scriptEditor.resetToSegments(segmentsToSave);
          }
          toast.success('Saving changes and regenerating audio...');
        },
      },
    );
  }, [
    podcast.id,
    scriptEditor,
    settings,
    sourceSelection,
    saveChangesMutation,
    updateMutation,
    generateMutation,
    needsFullRegeneration,
  ]);

  const handleGenerate = useCallback(() => {
    generateMutation.mutate({ id: podcast.id });
  }, [generateMutation, podcast.id]);

  const handleDelete = useCallback(() => {
    deleteMutation.mutate({ id: podcast.id });
  }, [deleteMutation, podcast.id]);

  return {
    hasAnyChanges,
    isSaving,
    isGenerating: isGenerating || isPendingGeneration,
    isPendingGeneration,
    isDeleting,
    needsFullRegeneration,
    handleSave,
    handleGenerate,
    handleDelete,
  };
}
