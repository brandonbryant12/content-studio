// features/voiceovers/components/voiceover-detail-container.tsx

import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
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
} from '../hooks';
import { isGeneratingStatus } from '../lib/status';
import { VoiceoverDetail } from './voiceover-detail';

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

  // State management via custom hook
  const settings = useVoiceoverSettings({ voiceover });

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

  return (
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
    />
  );
}
