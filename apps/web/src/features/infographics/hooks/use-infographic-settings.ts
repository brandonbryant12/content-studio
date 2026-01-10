import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';
import { getInfographicQueryKey } from './use-infographic';

type InfographicFull = RouterOutput['infographics']['get'];

// Style options type matching the API contract
export interface StyleOptions {
  colorScheme?: string;
  emphasis?: readonly string[];
  layout?: string;
}

// Helper to convert API style options (readonly) to mutable for local state
function toMutableStyleOptions(
  options: InfographicFull['styleOptions'],
): StyleOptions | null {
  if (!options) return null;
  return {
    colorScheme: options.colorScheme,
    emphasis: options.emphasis ? [...options.emphasis] : undefined,
    layout: options.layout,
  };
}

// Available aspect ratios with display info
export const ASPECT_RATIOS = [
  { id: '1:1', name: 'Square', description: 'Best for social media posts' },
  { id: '16:9', name: 'Widescreen', description: 'Best for presentations' },
  { id: '9:16', name: 'Portrait', description: 'Best for mobile/stories' },
  { id: '4:3', name: 'Standard', description: 'Traditional format' },
  { id: '3:4', name: 'Portrait Standard', description: 'Traditional portrait' },
  { id: '21:9', name: 'Ultra Wide', description: 'Cinematic format' },
] as const;

export type AspectRatioId = (typeof ASPECT_RATIOS)[number]['id'];

interface UseInfographicSettingsOptions {
  infographic: InfographicFull | undefined;
}

export interface UseInfographicSettingsReturn {
  // Current values
  infographicType: string;
  aspectRatio: string;
  customInstructions: string | null;
  feedbackInstructions: string | null;
  styleOptions: StyleOptions | null;
  title: string;

  // Setters
  setInfographicType: (type: string) => void;
  setAspectRatio: (ratio: string) => void;
  setCustomInstructions: (instructions: string | null) => void;
  setFeedbackInstructions: (instructions: string | null) => void;
  setStyleOptions: (options: StyleOptions | null) => void;
  setTitle: (title: string) => void;

  // State
  hasChanges: boolean;
  isSaving: boolean;

  // Actions
  saveSettings: () => Promise<void>;
  discardChanges: () => void;
}

// Get initial values from infographic or defaults
function getInitialValues(infographic: InfographicFull | undefined) {
  return {
    infographicType: infographic?.infographicType ?? '',
    aspectRatio: infographic?.aspectRatio ?? '1:1',
    customInstructions: infographic?.customInstructions ?? null,
    feedbackInstructions: infographic?.feedbackInstructions ?? null,
    styleOptions: toMutableStyleOptions(infographic?.styleOptions ?? null),
    title: infographic?.title ?? '',
  };
}

export function useInfographicSettings({
  infographic,
}: UseInfographicSettingsOptions): UseInfographicSettingsReturn {
  const queryClient = useQueryClient();

  // Track the infographic ID to detect navigation to a different infographic
  const infographicIdRef = useRef(infographic?.id);

  // Track whether user has made local edits (to avoid overwriting user changes)
  const hasUserEditsRef = useRef(false);

  // Initialize state from infographic
  const initial = getInitialValues(infographic);
  const [infographicType, setInfographicTypeInternal] = useState(
    initial.infographicType,
  );
  const [aspectRatio, setAspectRatioInternal] = useState(initial.aspectRatio);
  const [customInstructions, setCustomInstructionsInternal] = useState(
    initial.customInstructions,
  );
  const [feedbackInstructions, setFeedbackInstructionsInternal] = useState(
    initial.feedbackInstructions,
  );
  const [styleOptions, setStyleOptionsInternal] = useState<StyleOptions | null>(
    initial.styleOptions,
  );
  const [title, setTitleInternal] = useState(initial.title);

  // Wrapped setters that track user edits
  const setInfographicType = useCallback((value: string) => {
    hasUserEditsRef.current = true;
    setInfographicTypeInternal(value);
  }, []);

  const setAspectRatio = useCallback((value: string) => {
    hasUserEditsRef.current = true;
    setAspectRatioInternal(value);
  }, []);

  const setCustomInstructions = useCallback((value: string | null) => {
    hasUserEditsRef.current = true;
    setCustomInstructionsInternal(value);
  }, []);

  const setFeedbackInstructions = useCallback((value: string | null) => {
    hasUserEditsRef.current = true;
    setFeedbackInstructionsInternal(value);
  }, []);

  const setStyleOptions = useCallback((value: StyleOptions | null) => {
    hasUserEditsRef.current = true;
    setStyleOptionsInternal(value);
  }, []);

  const setTitle = useCallback((value: string) => {
    hasUserEditsRef.current = true;
    setTitleInternal(value);
  }, []);

  // Reset state when navigating to a different infographic
  if (infographic?.id !== infographicIdRef.current) {
    infographicIdRef.current = infographic?.id;
    hasUserEditsRef.current = false;
    const newInitial = getInitialValues(infographic);
    setInfographicTypeInternal(newInitial.infographicType);
    setAspectRatioInternal(newInitial.aspectRatio);
    setCustomInstructionsInternal(newInitial.customInstructions);
    setFeedbackInstructionsInternal(newInitial.feedbackInstructions);
    setStyleOptionsInternal(newInitial.styleOptions);
    setTitleInternal(newInitial.title);
  }

  // Sync local state when server data changes externally (wizard saves, SSE updates)
  // Only sync if user hasn't made local edits in the workbench
  useEffect(() => {
    if (hasUserEditsRef.current) return;

    const newInitial = getInitialValues(infographic);
    setInfographicTypeInternal(newInitial.infographicType);
    setAspectRatioInternal(newInitial.aspectRatio);
    setCustomInstructionsInternal(newInitial.customInstructions);
    setFeedbackInstructionsInternal(newInitial.feedbackInstructions);
    setStyleOptionsInternal(newInitial.styleOptions);
    setTitleInternal(newInitial.title);
  }, [
    infographic?.infographicType,
    infographic?.aspectRatio,
    infographic?.customInstructions,
    infographic?.feedbackInstructions,
    infographic?.styleOptions,
    infographic?.title,
  ]);

  // Track if there are changes compared to the current infographic values
  const hasChanges =
    infographicType !== (infographic?.infographicType ?? '') ||
    aspectRatio !== (infographic?.aspectRatio ?? '1:1') ||
    customInstructions !== (infographic?.customInstructions ?? null) ||
    feedbackInstructions !== (infographic?.feedbackInstructions ?? null) ||
    JSON.stringify(styleOptions) !==
      JSON.stringify(infographic?.styleOptions ?? null) ||
    title !== (infographic?.title ?? '');

  const updateMutation = useMutation(
    apiClient.infographics.update.mutationOptions({
      onSuccess: (response) => {
        // Update cache so other components see fresh data
        if (infographic?.id) {
          const queryKey = getInfographicQueryKey(infographic.id);
          queryClient.setQueryData(
            queryKey,
            (current: InfographicFull | undefined) => {
              if (!current) return current;
              return {
                ...current,
                ...response,
                // Preserve nested data not in response
                selections: current.selections,
              };
            },
          );
        }
        // Reset user edits flag after successful save
        hasUserEditsRef.current = false;
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to save settings'));
      },
    }),
  );

  const saveSettings = useCallback(async () => {
    if (!infographic?.id) return;

    await updateMutation.mutateAsync({
      id: infographic.id,
      title: title || undefined,
      infographicType: infographicType || undefined,
      aspectRatio: aspectRatio || undefined,
      customInstructions,
      feedbackInstructions,
      styleOptions,
    });
  }, [
    infographic?.id,
    title,
    infographicType,
    aspectRatio,
    customInstructions,
    feedbackInstructions,
    styleOptions,
    updateMutation,
  ]);

  const discardChanges = useCallback(() => {
    hasUserEditsRef.current = false;
    setInfographicTypeInternal(infographic?.infographicType ?? '');
    setAspectRatioInternal(infographic?.aspectRatio ?? '1:1');
    setCustomInstructionsInternal(infographic?.customInstructions ?? null);
    setFeedbackInstructionsInternal(infographic?.feedbackInstructions ?? null);
    setStyleOptionsInternal(
      toMutableStyleOptions(infographic?.styleOptions ?? null),
    );
    setTitleInternal(infographic?.title ?? '');
  }, [infographic]);

  return {
    // Current values
    infographicType,
    aspectRatio,
    customInstructions,
    feedbackInstructions,
    styleOptions,
    title,

    // Setters
    setInfographicType,
    setAspectRatio,
    setCustomInstructions,
    setFeedbackInstructions,
    setStyleOptions,
    setTitle,

    // State
    hasChanges,
    isSaving: updateMutation.isPending,

    // Actions
    saveSettings,
    discardChanges,
  };
}
