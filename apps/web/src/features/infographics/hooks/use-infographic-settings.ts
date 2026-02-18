import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { getInfographicQueryKey } from './use-infographic';
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

type InfographicDraftPatch = Partial<InfographicDraft>;

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
  saveSettings: (overrides?: InfographicDraftPatch) => Promise<void>;
  discardChanges: () => void;
}

function areEqualDrafts(a: InfographicDraft, b: InfographicDraft): boolean {
  return (
    a.prompt === b.prompt &&
    areEqualStyleProperties(a.styleProperties, b.styleProperties) &&
    a.format === b.format
  );
}

function normalizeType(
  type: StyleProperty['type'],
): NonNullable<StyleProperty['type']> {
  return type ?? 'text';
}

function areEqualStyleProperties(
  a: readonly StyleProperty[],
  b: readonly StyleProperty[],
): boolean {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (!left || !right) return false;

    if (
      left.key !== right.key ||
      left.value !== right.value ||
      normalizeType(left.type) !== normalizeType(right.type)
    ) {
      return false;
    }
  }

  return true;
}

export function useInfographicSettings({
  infographic,
}: UseInfographicSettingsOptions): UseInfographicSettingsReturn {
  const queryClient = useQueryClient();
  const [draftsByInfographicId, setDraftsByInfographicId] = useState<
    Record<string, InfographicDraft>
  >({});

  const infographicId = infographic?.id;
  const serverPrompt = infographic?.prompt ?? '';
  const serverStyleProperties = useMemo<StyleProperty[]>(
    () =>
      (infographic?.styleProperties ?? []).map((property) => ({ ...property })),
    [infographic?.styleProperties],
  );
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
    !areEqualStyleProperties(styleProperties, serverStyleProperties) ||
    format !== serverFormat;

  const updateMutation = useMutation(
    apiClient.infographics.update.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to save settings'));
      },
    }),
  );

  const saveSettings = useCallback(
    async (overrides?: InfographicDraftPatch) => {
      if (!infographicId) return;

      const nextPrompt = overrides?.prompt ?? prompt;
      const nextStyleProperties = overrides?.styleProperties ?? styleProperties;
      const nextFormat = overrides?.format ?? format;

      const updated = await updateMutation.mutateAsync({
        id: infographicId,
        prompt: nextPrompt,
        styleProperties: nextStyleProperties,
        format: nextFormat,
      });

      queryClient.setQueryData(getInfographicQueryKey(infographicId), updated);
      clearDraft(infographicId);
    },
    [
      infographicId,
      prompt,
      styleProperties,
      format,
      updateMutation,
      clearDraft,
      queryClient,
    ],
  );

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
