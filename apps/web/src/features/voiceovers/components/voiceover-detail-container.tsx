// features/voiceovers/components/voiceover-detail-container.tsx

import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';
import {
  useKeyboardShortcut,
  useNavigationBlock,
  useSessionGuard,
} from '@/shared/hooks';
import {
  useVoiceover,
  useVoiceoverSettings,
  useOptimisticGeneration,
  useCollaborators,
  useApproveVoiceover,
} from '../hooks';
import { isGeneratingStatus } from '../lib/status';
import { VoiceoverDetail } from './voiceover-detail';
import { AddCollaboratorDialog } from './collaborators';

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
  const { data: collaborators } = useCollaborators(voiceoverId);

  // Dialog state
  const [isCollaboratorDialogOpen, setCollaboratorDialogOpen] = useState(false);

  // State management via custom hook
  const settings = useVoiceoverSettings({ voiceover });

  // Mutations
  const generateMutation = useOptimisticGeneration(voiceoverId);
  const { approve, revoke } = useApproveVoiceover(voiceoverId, currentUserId);

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

  // Owner info for collaborator display
  const owner = useMemo(
    () => ({
      id: voiceover.createdBy,
      name: user?.id === voiceover.createdBy ? (user?.name ?? 'You') : 'Owner',
      image: user?.id === voiceover.createdBy ? user?.image : undefined,
      hasApproved: voiceover.ownerHasApproved,
    }),
    [
      voiceover.createdBy,
      voiceover.ownerHasApproved,
      user?.id,
      user?.name,
      user?.image,
    ],
  );

  // Check if current user has approved
  const currentUserHasApproved = useMemo(() => {
    if (currentUserId === voiceover.createdBy) {
      return voiceover.ownerHasApproved;
    }
    const userCollaborator = collaborators.find(
      (c) => c.userId === currentUserId,
    );
    return userCollaborator?.hasApproved ?? false;
  }, [
    currentUserId,
    voiceover.createdBy,
    voiceover.ownerHasApproved,
    collaborators,
  ]);

  // Handler to save settings
  const handleSave = useCallback(async () => {
    if (settings.isSaving) return;

    await settings.saveSettings();
    toast.success('Settings saved');
  }, [settings]);

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

  const handleManageCollaborators = useCallback(() => {
    setCollaboratorDialogOpen(true);
  }, []);

  // Approval handlers
  const handleApprove = useCallback(() => {
    approve.mutate({ id: voiceover.id });
  }, [approve, voiceover.id]);

  const handleRevoke = useCallback(() => {
    revoke.mutate({ id: voiceover.id });
  }, [revoke, voiceover.id]);

  const isApprovalPending = approve.isPending || revoke.isPending;

  // Keyboard shortcut: Cmd/Ctrl+S to save
  useKeyboardShortcut({
    key: 's',
    cmdOrCtrl: true,
    onTrigger: handleSave,
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
        onSave={handleSave}
        onGenerate={handleGenerate}
        onDelete={handleDelete}
        currentUserId={currentUserId}
        owner={owner}
        collaborators={collaborators}
        currentUserHasApproved={currentUserHasApproved}
        onManageCollaborators={handleManageCollaborators}
        onApprove={handleApprove}
        onRevoke={handleRevoke}
        isApprovalPending={isApprovalPending}
      />

      {/* Collaborator management dialog (only for owner) */}
      {isOwner && (
        <AddCollaboratorDialog
          voiceoverId={voiceoverId}
          isOpen={isCollaboratorDialogOpen}
          onClose={() => setCollaboratorDialogOpen(false)}
        />
      )}
    </>
  );
}
