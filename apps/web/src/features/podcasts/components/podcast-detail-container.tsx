// features/podcasts/components/podcast-detail-container.tsx

import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';
import {
  useKeyboardShortcut,
  useNavigationBlock,
} from '@/shared/hooks';
import {
  usePodcast,
  useScriptEditor,
  usePodcastSettings,
  useDocumentSelection,
  useOptimisticGeneration,
  useOptimisticSaveChanges,
} from '../hooks';
import { isSetupMode, isGeneratingStatus } from '../lib/status';
import { SetupWizardContainer } from './setup-wizard-container';
import { PodcastDetail } from './podcast-detail';

interface PodcastDetailContainerProps {
  podcastId: string;
}

/**
 * Container: Fetches podcast data and coordinates all state/mutations.
 * Renders SetupWizardContainer for new podcasts, PodcastDetail for configured ones.
 */
export function PodcastDetailContainer({ podcastId }: PodcastDetailContainerProps) {
  const navigate = useNavigate();

  // Data fetching (Suspense handles loading)
  const { data: podcast } = usePodcast(podcastId);

  // State management via custom hooks
  const scriptEditor = useScriptEditor({
    podcastId,
    initialSegments: [...(podcast.activeVersion?.segments ?? [])],
  });

  const settings = usePodcastSettings({ podcast });

  const documentSelection = useDocumentSelection({
    initialDocuments: [...(podcast.documents ?? [])],
  });

  // Mutations
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

  // Computed state
  const hasAnyChanges =
    scriptEditor.hasChanges || settings.hasChanges || documentSelection.hasChanges;

  const isGenerating = isGeneratingStatus(podcast.activeVersion?.status);
  const isPendingGeneration = generateMutation.isPending;

  // Combined save handler for script, voice, and document changes
  const handleSave = useCallback(async () => {
    if (saveChangesMutation.isPending || updateMutation.isPending || generateMutation.isPending) {
      return;
    }

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
          toast.success('Saving changes and regenerating audio...');
        },
      },
    );
  }, [
    podcast.id,
    scriptEditor,
    settings,
    documentSelection,
    saveChangesMutation,
    updateMutation,
    generateMutation,
  ]);

  const handleGenerate = useCallback(() => {
    generateMutation.mutate({ id: podcast.id });
  }, [generateMutation, podcast.id]);

  const handleDelete = useCallback(() => {
    deleteMutation.mutate({ id: podcast.id });
  }, [deleteMutation, podcast.id]);

  // Keyboard shortcut: Cmd/Ctrl+S to save
  useKeyboardShortcut({
    key: 's',
    cmdOrCtrl: true,
    onTrigger: handleSave,
    enabled: hasAnyChanges,
  });

  // Block navigation if there are unsaved changes
  useNavigationBlock({
    shouldBlock: hasAnyChanges,
  });

  // Show setup wizard for new podcasts
  if (isSetupMode(podcast)) {
    return <SetupWizardContainer podcast={podcast} />;
  }

  // Audio from active version
  const displayAudio = podcast.activeVersion?.audioUrl
    ? {
        url: podcast.activeVersion.audioUrl,
        duration: podcast.activeVersion.duration ?? null,
      }
    : null;

  return (
    <PodcastDetail
      podcast={podcast}
      scriptEditor={scriptEditor}
      settings={settings}
      documentSelection={documentSelection}
      displayAudio={displayAudio}
      hasChanges={hasAnyChanges}
      isGenerating={isGenerating || isPendingGeneration}
      isPendingGeneration={isPendingGeneration}
      isSaving={saveChangesMutation.isPending || updateMutation.isPending}
      isDeleting={deleteMutation.isPending}
      onSave={handleSave}
      onGenerate={handleGenerate}
      onDelete={handleDelete}
    />
  );
}
