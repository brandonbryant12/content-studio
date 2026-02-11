import { useMutation } from '@tanstack/react-query';
import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

type InfographicFull = RouterOutput['infographics']['get'];
type InfographicType = InfographicFull['infographicType'];
type InfographicStyle = InfographicFull['stylePreset'];
type InfographicFormat = InfographicFull['format'];

interface UseInfographicSettingsOptions {
  infographic: InfographicFull | undefined;
}

export interface UseInfographicSettingsReturn {
  // Current values
  prompt: string;
  infographicType: InfographicType;
  stylePreset: InfographicStyle;
  format: InfographicFormat;

  // Setters
  setPrompt: (prompt: string) => void;
  setInfographicType: (type: InfographicType) => void;
  setStylePreset: (style: InfographicStyle) => void;
  setFormat: (format: InfographicFormat) => void;

  // State
  hasChanges: boolean;
  isSaving: boolean;

  // Actions
  saveSettings: (extra?: { sourceDocumentIds?: string[] }) => Promise<void>;
  discardChanges: () => void;
}

function getInitialValues(infographic: InfographicFull | undefined) {
  return {
    prompt: infographic?.prompt ?? '',
    infographicType: infographic?.infographicType ?? 'key_takeaways',
    stylePreset: infographic?.stylePreset ?? 'modern_minimal',
    format: infographic?.format ?? 'portrait',
  } as const;
}

export function useInfographicSettings({
  infographic,
}: UseInfographicSettingsOptions): UseInfographicSettingsReturn {
  const [prevInfographicId, setPrevInfographicId] = useState(infographic?.id);
  const hasUserEditsRef = useRef(false);

  const initial = getInitialValues(infographic);
  const [prompt, setPromptInternal] = useState(initial.prompt);
  const [infographicType, setTypeInternal] = useState(initial.infographicType);
  const [stylePreset, setStyleInternal] = useState(initial.stylePreset);
  const [format, setFormatInternal] = useState(initial.format);

  // Wrapped setters that track user edits
  const setPrompt = useCallback((value: string) => {
    hasUserEditsRef.current = true;
    setPromptInternal(value);
  }, []);

  const setInfographicType = useCallback((value: InfographicType) => {
    hasUserEditsRef.current = true;
    setTypeInternal(value);
  }, []);

  const setStylePreset = useCallback((value: InfographicStyle) => {
    hasUserEditsRef.current = true;
    setStyleInternal(value);
  }, []);

  const setFormat = useCallback((value: InfographicFormat) => {
    hasUserEditsRef.current = true;
    setFormatInternal(value);
  }, []);

  // Reset state when navigating to a different infographic
  if (infographic?.id !== prevInfographicId) {
    setPrevInfographicId(infographic?.id);
    const newInitial = getInitialValues(infographic);
    setPromptInternal(newInitial.prompt);
    setTypeInternal(newInitial.infographicType);
    setStyleInternal(newInitial.stylePreset);
    setFormatInternal(newInitial.format);
  }

  // Reset user-edits flag when navigating to a different infographic
  useEffect(() => {
    hasUserEditsRef.current = false;
  }, [prevInfographicId]);

  // Sync local state when server data changes externally (e.g., SSE update)
  useEffect(() => {
    if (hasUserEditsRef.current) return;

    const newInitial = getInitialValues(infographic);
    setPromptInternal(newInitial.prompt);
    setTypeInternal(newInitial.infographicType);
    setStyleInternal(newInitial.stylePreset);
    setFormatInternal(newInitial.format);
  }, [
    infographic,
    infographic?.prompt,
    infographic?.infographicType,
    infographic?.stylePreset,
    infographic?.format,
  ]);

  const hasChanges =
    prompt !== (infographic?.prompt ?? '') ||
    infographicType !== (infographic?.infographicType ?? 'key_takeaways') ||
    stylePreset !== (infographic?.stylePreset ?? 'modern_minimal') ||
    format !== (infographic?.format ?? 'portrait');

  const updateMutation = useMutation(
    apiClient.infographics.update.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to save settings'));
      },
    }),
  );

  const saveSettings = useCallback(
    async (extra?: { sourceDocumentIds?: string[] }) => {
      if (!infographic?.id) return;

      await updateMutation.mutateAsync({
        id: infographic.id,
        prompt,
        infographicType,
        stylePreset,
        format,
        ...(extra?.sourceDocumentIds !== undefined
          ? { sourceDocumentIds: extra.sourceDocumentIds }
          : {}),
      });

      hasUserEditsRef.current = false;
    },
    [
      infographic?.id,
      prompt,
      infographicType,
      stylePreset,
      format,
      updateMutation,
    ],
  );

  const discardChanges = useCallback(() => {
    hasUserEditsRef.current = false;
    const initial = getInitialValues(infographic);
    setPromptInternal(initial.prompt);
    setTypeInternal(initial.infographicType);
    setStyleInternal(initial.stylePreset);
    setFormatInternal(initial.format);
  }, [infographic]);

  return {
    prompt,
    infographicType,
    stylePreset,
    format,
    setPrompt,
    setInfographicType,
    setStylePreset,
    setFormat,
    hasChanges,
    isSaving: updateMutation.isPending,
    saveSettings,
    discardChanges,
  };
}
