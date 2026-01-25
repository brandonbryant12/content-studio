// features/podcasts/components/podcast-detail-container.tsx

import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';
import {
  useKeyboardShortcut,
  useNavigationBlock,
  useSessionGuard,
} from '@/shared/hooks';
import { usePodcast } from '../hooks/use-podcast';
import { useScriptEditor } from '../hooks/use-script-editor';
import { usePodcastSettings } from '../hooks/use-podcast-settings';
import { useDocumentSelection } from '../hooks/use-document-selection';
import { useOptimisticGeneration } from '../hooks/use-optimistic-generation';
import { useOptimisticSaveChanges } from '../hooks/use-optimistic-save-changes';
import { useCollaboratorsQuery } from '../hooks/use-collaborators';
import { isSetupMode, isGeneratingStatus } from '../lib/status';
import { SetupWizardContainer } from './setup-wizard-container';
import { PodcastDetail } from './podcast-detail';
import { AddCollaboratorDialog } from './collaborators';

interface PodcastDetailContainerProps {
  podcastId: string;
}

/**
 * Container: Fetches podcast data and coordinates all state/mutations.
 * Renders SetupWizardContainer for new podcasts, PodcastDetail for configured ones.
 */
export function PodcastDetailContainer({
  podcastId,
}: PodcastDetailContainerProps) {
  const navigate = useNavigate();

  // Get current user
  const { user } = useSessionGuard();
  const currentUserId = user?.id ?? '';

  // Data fetching (Suspense handles loading)
  const { data: podcast } = usePodcast(podcastId);

  // Collaborator data
  const { data: collaborators = [] } = useCollaboratorsQuery(podcastId);

  // Add collaborator dialog state
  const [isAddCollaboratorOpen, setIsAddCollaboratorOpen] = useState(false);

  // State management via custom hooks
  const scriptEditor = useScriptEditor({
    podcastId,
    initialSegments: [...(podcast.segments ?? [])],
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
    scriptEditor.hasChanges ||
    settings.hasChanges ||
    documentSelection.hasChanges;

  const isGenerating = isGeneratingStatus(podcast.status);
  const isPendingGeneration = generateMutation.isPending;

  // Owner info for collaborator display
  const owner = {
    id: podcast.createdBy,
    name: user?.id === podcast.createdBy ? (user?.name ?? 'You') : 'Owner',
    image: user?.id === podcast.createdBy ? user?.image : undefined,
    hasApproved: podcast.ownerHasApproved,
  };

  // Check if current user has approved
  const currentUserHasApproved =
    podcast.createdBy === currentUserId
      ? podcast.ownerHasApproved
      : (collaborators.find((c) => c.userId === currentUserId)?.hasApproved ??
        false);

  // Combined save handler for script, voice, and document changes
  const handleSave = useCallback(async () => {
    if (
      saveChangesMutation.isPending ||
      updateMutation.isPending ||
      generateMutation.isPending
    ) {
      return;
    }

    // If documents or script-affecting settings changed, we need full regeneration (script + audio)
    if (documentSelection.hasChanges || settings.hasScriptSettingsChanges) {
      try {
        // First, save documents and any settings changes
        await updateMutation.mutateAsync({
          id: podcast.id,
          documentIds: documentSelection.hasChanges
            ? documentSelection.documentIds
            : undefined,
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
              const message = documentSelection.hasChanges
                ? 'Regenerating podcast with new sources...'
                : 'Regenerating script with new settings...';
              toast.success(message);
            },
          },
        );
      } catch {
        // Error already handled by mutation
      }
      return;
    }

    // No document or script settings changes - just save script/voice and regenerate audio
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

  const handleManageCollaborators = useCallback(() => {
    setIsAddCollaboratorOpen(true);
  }, []);

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

  // Audio from podcast
  const displayAudio = podcast.audioUrl
    ? {
        url: podcast.audioUrl,
        duration: podcast.duration ?? null,
      }
    : null;

  return (
    <>
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
        currentUserId={currentUserId}
        owner={owner}
        collaborators={collaborators}
        currentUserHasApproved={currentUserHasApproved}
        onManageCollaborators={handleManageCollaborators}
      />
      <AddCollaboratorDialog
        podcastId={podcastId}
        isOpen={isAddCollaboratorOpen}
        onClose={() => setIsAddCollaboratorOpen(false)}
      />
    </>
  );
}
