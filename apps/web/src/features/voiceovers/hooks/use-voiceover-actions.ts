import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { toast } from 'sonner';
import type { UseVoiceoverSettingsReturn } from './use-voiceover-settings';
import type { RouterOutput } from '@repo/api/client';
import { isGeneratingStatus } from '../lib/status';
import { useOptimisticGeneration } from './use-optimistic-generation';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

type Voiceover = RouterOutput['voiceovers']['get'];

export interface UseVoiceoverActionsReturn {
  hasChanges: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  isPendingGeneration: boolean;
  isDeleting: boolean;
  hasText: boolean;
  handleGenerate: () => Promise<void>;
  handleDelete: () => void;
}

interface UseVoiceoverActionsOptions {
  voiceoverId: string;
  voiceover: Voiceover;
  settings: UseVoiceoverSettingsReturn;
}

export function useVoiceoverActions({
  voiceoverId,
  voiceover,
  settings,
}: UseVoiceoverActionsOptions): UseVoiceoverActionsReturn {
  const navigate = useNavigate();

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

  const isGenerating = isGeneratingStatus(voiceover.status);
  const isPendingGeneration = generateMutation.isPending;
  const hasText = settings.text.trim().length > 0;

  const handleGenerate = useCallback(async () => {
    if (isPendingGeneration || isGenerating) return;

    if (settings.hasChanges) {
      await settings.saveSettings();
    }

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

  return {
    hasChanges: settings.hasChanges,
    isSaving: settings.isSaving,
    isGenerating: isGenerating || isPendingGeneration,
    isPendingGeneration,
    isDeleting: deleteMutation.isPending,
    hasText,
    handleGenerate,
    handleDelete,
  };
}
