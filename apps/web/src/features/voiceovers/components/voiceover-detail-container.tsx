// features/voiceovers/components/voiceover-detail-container.tsx

import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { lazy, Suspense, useCallback } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';
import {
  useKeyboardShortcut,
  useNavigationBlock,
  useSessionGuard,
} from '@/shared/hooks';
import { useVoiceover } from '../hooks/use-voiceover';
import { useVoiceoverSettings } from '../hooks/use-voiceover-settings';
import { useOptimisticGeneration } from '../hooks/use-optimistic-generation';
import { useCollaboratorManagement } from '../hooks/use-collaborator-management';
import { isGeneratingStatus } from '../lib/status';
import { VoiceoverDetail } from './voiceover-detail';

// Dynamic import for collaborator dialog (only needed when opened)
const AddCollaboratorDialog = lazy(() =>
  import('./collaborators/add-collaborator-dialog').then((m) => ({
    default: m.AddCollaboratorDialog,
  })),
);

interface VoiceoverDetailContainerProps {
  voiceoverId: string;
}

export function VoiceoverDetailContainer({
  voiceoverId,
}: VoiceoverDetailContainerProps) {
  const navigate = useNavigate();

  // Get current user
  const { user } = useSessionGuard();
  const currentUserId = user?.id ?? '';

  // Data fetching (Suspense handles loading)
  const { data: voiceover } = useVoiceover(voiceoverId);

  // State management via custom hooks
  const settings = useVoiceoverSettings({ voiceover });
  const collaboratorManagement = useCollaboratorManagement(
    voiceover,
    currentUserId,
    user,
  );

  // Mutations
  const generateMutation = useOptimisticGeneration(voiceoverId);

  const deleteMutation = useMutation(
    apiClient.voiceovers.delete.mutationOptions({
      onSuccess: () => {
        toast.success('Voiceover deleted');
        navigate({ to: '/voiceovers' });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to delete voiceover'));
      },
    }),
  );

  // Computed state
  const isGenerating = isGeneratingStatus(voiceover.status);
  const isPendingGeneration = generateMutation.isPending;
  const hasText = settings.text.trim().length > 0;

  // Handler to generate audio (saves first if there are changes)
  const handleGenerate = useCallback(async () => {
    if (isPendingGeneration || isGenerating) return;

    // Save changes first if there are any
    if (settings.hasChanges) {
      await settings.saveSettings();
    }

    // Then generate
    generateMutation.mutate({ id: voiceover.id });
  }, [
    isPendingGeneration,
    isGenerating,
    settings,
    generateMutation,
    voiceover.id,
  ]);

  const handleDelete = useCallback(() => {
    deleteMutation.mutate({ id: voiceover.id });
  }, [deleteMutation, voiceover.id]);

  // Keyboard shortcut: Cmd/Ctrl+S to save and generate
  useKeyboardShortcut({
    key: 's',
    cmdOrCtrl: true,
    onTrigger: handleGenerate,
    enabled: settings.hasChanges,
  });

  // Block navigation if there are unsaved changes
  useNavigationBlock({
    shouldBlock: settings.hasChanges,
  });

  // Audio from voiceover
  const displayAudio = voiceover.audioUrl
    ? {
        url: voiceover.audioUrl,
        duration: voiceover.duration ?? null,
      }
    : null;

  const isOwner = currentUserId === voiceover.createdBy;

  return (
    <>
      <VoiceoverDetail
        voiceover={voiceover}
        settings={settings}
        displayAudio={displayAudio}
        hasChanges={settings.hasChanges}
        hasText={hasText}
        isGenerating={isGenerating || isPendingGeneration}
        isSaving={settings.isSaving}
        isDeleting={deleteMutation.isPending}
        onGenerate={handleGenerate}
        onDelete={handleDelete}
        currentUserId={currentUserId}
        owner={collaboratorManagement.owner}
        collaborators={collaboratorManagement.collaborators}
        currentUserHasApproved={collaboratorManagement.currentUserHasApproved}
        onManageCollaborators={collaboratorManagement.openAddDialog}
        onApprove={collaboratorManagement.handleApprove}
        onRevoke={collaboratorManagement.handleRevoke}
        isApprovalPending={collaboratorManagement.isApprovalPending}
      />

      {/* Collaborator management dialog (only for owner) */}
      {isOwner && collaboratorManagement.isAddDialogOpen && (
        <Suspense fallback={null}>
          <AddCollaboratorDialog
            voiceoverId={voiceoverId}
            isOpen={collaboratorManagement.isAddDialogOpen}
            onClose={collaboratorManagement.closeAddDialog}
          />
        </Suspense>
      )}
    </>
  );
}
