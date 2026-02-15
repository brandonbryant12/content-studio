import { useMutation } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
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

interface InfographicDraft {
  prompt: string;
  infographicType: InfographicType;
  stylePreset: InfographicStyle;
  format: InfographicFormat;
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

function areEqualDrafts(a: InfographicDraft, b: InfographicDraft): boolean {
  return (
    a.prompt === b.prompt &&
    a.infographicType === b.infographicType &&
    a.stylePreset === b.stylePreset &&
    a.format === b.format
  );
}

export function useInfographicSettings({
  infographic,
}: UseInfographicSettingsOptions): UseInfographicSettingsReturn {
  const [draftsByInfographicId, setDraftsByInfographicId] = useState<
    Record<string, InfographicDraft>
  >({});

  const infographicId = infographic?.id;
  const serverPrompt = infographic?.prompt ?? '';
  const serverInfographicType = infographic?.infographicType ?? 'key_takeaways';
  const serverStylePreset = infographic?.stylePreset ?? 'modern_minimal';
  const serverFormat = infographic?.format ?? 'portrait';
  const draftValues = infographicId
    ? draftsByInfographicId[infographicId]
    : undefined;

  const prompt = draftValues?.prompt ?? serverPrompt;
  const infographicType = draftValues?.infographicType ?? serverInfographicType;
  const stylePreset = draftValues?.stylePreset ?? serverStylePreset;
  const format = draftValues?.format ?? serverFormat;

  const clearDraft = useCallback((id: string) => {
    setDraftsByInfographicId((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const updateDraft = useCallback(
    (patch: Partial<InfographicDraft>) => {
      if (!infographicId) return;

      setDraftsByInfographicId((prev) => {
        const serverValues: InfographicDraft = {
          prompt: serverPrompt,
          infographicType: serverInfographicType,
          stylePreset: serverStylePreset,
          format: serverFormat,
        };
        const current = prev[infographicId] ?? serverValues;
        const next = { ...current, ...patch };

        if (areEqualDrafts(next, serverValues)) {
          if (!(infographicId in prev)) return prev;
          const { [infographicId]: _removed, ...rest } = prev;
          return rest;
        }

        return {
          ...prev,
          [infographicId]: next,
        };
      });
    },
    [
      infographicId,
      serverPrompt,
      serverInfographicType,
      serverStylePreset,
      serverFormat,
    ],
  );

  const setPrompt = useCallback(
    (value: string) => {
      updateDraft({ prompt: value });
    },
    [updateDraft],
  );

  const setInfographicType = useCallback(
    (value: InfographicType) => {
      updateDraft({ infographicType: value });
    },
    [updateDraft],
  );

  const setStylePreset = useCallback(
    (value: InfographicStyle) => {
      updateDraft({ stylePreset: value });
    },
    [updateDraft],
  );

  const setFormat = useCallback(
    (value: InfographicFormat) => {
      updateDraft({ format: value });
    },
    [updateDraft],
  );

  const hasChanges =
    prompt !== serverPrompt ||
    infographicType !== serverInfographicType ||
    stylePreset !== serverStylePreset ||
    format !== serverFormat;

  const updateMutation = useMutation(
    apiClient.infographics.update.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to save settings'));
      },
    }),
  );

  const saveSettings = useCallback(
    async (extra?: { sourceDocumentIds?: string[] }) => {
      if (!infographicId) return;

      await updateMutation.mutateAsync({
        id: infographicId,
        prompt,
        infographicType,
        stylePreset,
        format,
        ...extra,
      });

      clearDraft(infographicId);
    },
    [
      infographicId,
      prompt,
      infographicType,
      stylePreset,
      format,
      updateMutation,
      clearDraft,
    ],
  );

  const discardChanges = useCallback(() => {
    if (!infographicId) return;
    clearDraft(infographicId);
  }, [infographicId, clearDraft]);

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
