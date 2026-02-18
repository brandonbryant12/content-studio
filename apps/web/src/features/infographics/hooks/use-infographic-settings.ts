import { useMutation } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

type InfographicFull = RouterOutput['infographics']['get'];
type InfographicFormat = InfographicFull['format'];

export interface StyleProperty {
  key: string;
  value: string;
  type?: 'text' | 'color' | 'number';
}

interface UseInfographicSettingsOptions {
  infographic: InfographicFull | undefined;
}

interface InfographicDraft {
  prompt: string;
  styleProperties: StyleProperty[];
  format: InfographicFormat;
}

export interface UseInfographicSettingsReturn {
  // Current values
  prompt: string;
  styleProperties: StyleProperty[];
  format: InfographicFormat;

  // Setters
  setPrompt: (prompt: string) => void;
  setStyleProperties: (properties: StyleProperty[]) => void;
  setFormat: (format: InfographicFormat) => void;

  // State
  hasChanges: boolean;
  isSaving: boolean;

  // Actions
  saveSettings: () => Promise<void>;
  discardChanges: () => void;
}

function areEqualDrafts(a: InfographicDraft, b: InfographicDraft): boolean {
  return (
    a.prompt === b.prompt &&
    JSON.stringify(a.styleProperties) === JSON.stringify(b.styleProperties) &&
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
  const serverStyleProperties: StyleProperty[] =
    (infographic?.styleProperties as StyleProperty[] | undefined) ?? [];
  const serverFormat = infographic?.format ?? 'portrait';
  const draftValues = infographicId
    ? draftsByInfographicId[infographicId]
    : undefined;

  const prompt = draftValues?.prompt ?? serverPrompt;
  const styleProperties = draftValues?.styleProperties ?? serverStyleProperties;
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
          styleProperties: serverStyleProperties,
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
    [infographicId, serverPrompt, serverStyleProperties, serverFormat],
  );

  const setPrompt = useCallback(
    (value: string) => {
      updateDraft({ prompt: value });
    },
    [updateDraft],
  );

  const setStyleProperties = useCallback(
    (value: StyleProperty[]) => {
      updateDraft({ styleProperties: value });
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
    JSON.stringify(styleProperties) !== JSON.stringify(serverStyleProperties) ||
    format !== serverFormat;

  const updateMutation = useMutation(
    apiClient.infographics.update.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to save settings'));
      },
    }),
  );

  const saveSettings = useCallback(async () => {
    if (!infographicId) return;

    await updateMutation.mutateAsync({
      id: infographicId,
      prompt,
      styleProperties,
      format,
    });

    clearDraft(infographicId);
  }, [
    infographicId,
    prompt,
    styleProperties,
    format,
    updateMutation,
    clearDraft,
  ]);

  const discardChanges = useCallback(() => {
    if (!infographicId) return;
    clearDraft(infographicId);
  }, [infographicId, clearDraft]);

  return {
    prompt,
    styleProperties,
    format,
    setPrompt,
    setStyleProperties,
    setFormat,
    hasChanges,
    isSaving: updateMutation.isPending,
    saveSettings,
    discardChanges,
  };
}
