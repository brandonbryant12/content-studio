import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import { toast } from 'sonner';
import type { UseInfographicSettingsReturn } from './use-infographic-settings';
import type { RouterOutput } from '@repo/api/client';
import type { UseDocumentSelectionReturn } from '@/shared/hooks/use-document-selection';
import { isGeneratingStatus } from '../lib/status';
import { useOptimisticGeneration } from './use-optimistic-generation';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

type InfographicFull = RouterOutput['infographics']['get'];

export interface UseInfographicActionsReturn {
  hasChanges: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  isPendingGeneration: boolean;
  isDeleting: boolean;
  hasPrompt: boolean;
  handleSave: () => Promise<void>;
  handleGenerate: () => Promise<void>;
  handleDelete: () => void;
}

interface UseInfographicActionsOptions {
  infographicId: string;
  infographic: InfographicFull;
  settings: UseInfographicSettingsReturn;
  documentSelection: UseDocumentSelectionReturn;
}

export function useInfographicActions({
  infographicId,
  infographic,
  settings,
  documentSelection,
}: UseInfographicActionsOptions): UseInfographicActionsReturn {
  const navigate = useNavigate();

  const generateMutation = useOptimisticGeneration(infographicId);

  const deleteMutation = useMutation(
    apiClient.infographics.delete.mutationOptions({
      onSuccess: () => {
        toast.success('Infographic deleted');
        navigate({ to: '/infographics' });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to delete infographic'));
      },
    }),
  );

  const isGenerating = isGeneratingStatus(infographic.status);
  const isPendingGeneration = generateMutation.isPending;
  const hasPrompt = settings.prompt.trim().length > 0;

  const handleSave = useCallback(async () => {
    if (settings.isSaving || generateMutation.isPending) return;
    if (!settings.hasChanges && !documentSelection.hasChanges) return;

    await settings.saveSettings({
      sourceDocumentIds: documentSelection.documentIds,
    });
    toast.success('Settings saved');
  }, [settings, generateMutation.isPending, documentSelection]);

  const handleGenerate = useCallback(async () => {
    if (isPendingGeneration || isGenerating) return;

    // Save any pending changes first (including document selections)
    if (settings.hasChanges || documentSelection.hasChanges) {
      await settings.saveSettings({
        sourceDocumentIds: documentSelection.documentIds,
      });
    }

    generateMutation.mutate({ id: infographic.id });
  }, [
    isPendingGeneration,
    isGenerating,
    settings,
    documentSelection,
    generateMutation,
    infographic.id,
  ]);

  const handleDelete = useCallback(() => {
    deleteMutation.mutate({ id: infographic.id });
  }, [deleteMutation, infographic.id]);

  return {
    hasChanges: settings.hasChanges || documentSelection.hasChanges,
    isSaving: settings.isSaving,
    isGenerating: isGenerating || isPendingGeneration,
    isPendingGeneration,
    isDeleting: deleteMutation.isPending,
    hasPrompt,
    handleSave,
    handleGenerate,
    handleDelete,
  };
}
