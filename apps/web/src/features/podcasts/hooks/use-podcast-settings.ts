import { useMutation } from '@tanstack/react-query';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

type PodcastFull = RouterOutput['podcasts']['get'];

// Voice options - these match the Gemini TTS voices
export const VOICES = [
  {
    id: 'Aoede',
    name: 'Aoede',
    gender: 'female',
    description: 'Melodic and engaging',
  },
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'female',
    description: 'Youthful and energetic',
  },
  {
    id: 'Leda',
    name: 'Leda',
    gender: 'female',
    description: 'Friendly and approachable',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'female',
    description: 'Light and airy',
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'male',
    description: 'Clear and professional',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'male',
    description: 'Bold and dynamic',
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'male',
    description: 'Lively and engaging',
  },
  {
    id: 'Orus',
    name: 'Orus',
    gender: 'male',
    description: 'Friendly and conversational',
  },
] as const;

export const MIN_DURATION = 1;
export const MAX_DURATION = 10;

interface UsePodcastSettingsOptions {
  podcast: PodcastFull | undefined;
}

export interface UsePodcastSettingsReturn {
  // Current values
  hostVoice: string;
  coHostVoice: string;
  targetDuration: number;
  instructions: string;

  // Setters
  setHostVoice: (voice: string) => void;
  setCoHostVoice: (voice: string) => void;
  setTargetDuration: (duration: number) => void;
  setInstructions: (instructions: string) => void;

  // State
  hasChanges: boolean;
  hasScriptSettingsChanges: boolean;
  isSaving: boolean;

  // Actions
  saveSettings: () => Promise<void>;
  discardChanges: () => void;
}

// Get initial values from podcast or defaults
function getInitialValues(podcast: PodcastFull | undefined) {
  return {
    hostVoice: podcast?.hostVoice ?? 'Aoede',
    coHostVoice: podcast?.coHostVoice ?? 'Charon',
    targetDuration: podcast?.targetDurationMinutes ?? 5,
    instructions: podcast?.promptInstructions ?? '',
  };
}

export function usePodcastSettings({
  podcast,
}: UsePodcastSettingsOptions): UsePodcastSettingsReturn {
  // Track the podcast ID to detect navigation to a different podcast
  const podcastIdRef = useRef(podcast?.id);

  // Track whether user has made local edits (to avoid overwriting user changes)
  const hasUserEditsRef = useRef(false);

  // Initialize state from podcast
  const initial = getInitialValues(podcast);
  const [hostVoice, setHostVoiceInternal] = useState(initial.hostVoice);
  const [coHostVoice, setCoHostVoiceInternal] = useState(initial.coHostVoice);
  const [targetDuration, setTargetDurationInternal] = useState(
    initial.targetDuration,
  );
  const [instructions, setInstructionsInternal] = useState(
    initial.instructions,
  );

  // Wrapped setters that track user edits
  const setHostVoice = useCallback((value: string) => {
    hasUserEditsRef.current = true;
    setHostVoiceInternal(value);
  }, []);

  const setCoHostVoice = useCallback((value: string) => {
    hasUserEditsRef.current = true;
    setCoHostVoiceInternal(value);
  }, []);

  const setTargetDuration = useCallback((value: number) => {
    hasUserEditsRef.current = true;
    setTargetDurationInternal(value);
  }, []);

  const setInstructions = useCallback((value: string) => {
    hasUserEditsRef.current = true;
    setInstructionsInternal(value);
  }, []);

  // Reset state when navigating to a different podcast
  if (podcast?.id !== podcastIdRef.current) {
    podcastIdRef.current = podcast?.id;
    hasUserEditsRef.current = false;
    const newInitial = getInitialValues(podcast);
    setHostVoiceInternal(newInitial.hostVoice);
    setCoHostVoiceInternal(newInitial.coHostVoice);
    setTargetDurationInternal(newInitial.targetDuration);
    setInstructionsInternal(newInitial.instructions);
  }

  // Sync local state when server data changes externally (wizard saves, SSE updates)
  // Only sync if user hasn't made local edits in the workbench
  useEffect(() => {
    if (hasUserEditsRef.current) return;

    const newInitial = getInitialValues(podcast);
    setHostVoiceInternal(newInitial.hostVoice);
    setCoHostVoiceInternal(newInitial.coHostVoice);
    setTargetDurationInternal(newInitial.targetDuration);
    setInstructionsInternal(newInitial.instructions);
  }, [
    podcast?.hostVoice,
    podcast?.coHostVoice,
    podcast?.targetDurationMinutes,
    podcast?.promptInstructions,
  ]);

  // Track if script-affecting settings changed (requires script regeneration)
  const hasScriptSettingsChanges =
    targetDuration !== (podcast?.targetDurationMinutes ?? 5) ||
    instructions !== (podcast?.promptInstructions ?? '');

  // Track if there are changes compared to the current podcast values
  const hasChanges =
    hostVoice !== (podcast?.hostVoice ?? 'Aoede') ||
    coHostVoice !== (podcast?.coHostVoice ?? 'Charon') ||
    hasScriptSettingsChanges;

  const updateMutation = useMutation(
    apiClient.podcasts.update.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to save settings'));
      },
    }),
  );

  const saveSettings = useCallback(async () => {
    if (!podcast?.id) return;

    const hostVoiceInfo = VOICES.find((v) => v.id === hostVoice);
    const coHostVoiceInfo = VOICES.find((v) => v.id === coHostVoice);

    await updateMutation.mutateAsync({
      id: podcast.id,
      hostVoice,
      hostVoiceName: hostVoiceInfo?.name,
      coHostVoice,
      coHostVoiceName: coHostVoiceInfo?.name,
      targetDurationMinutes: targetDuration,
      promptInstructions: instructions || undefined,
    });
  }, [
    podcast?.id,
    hostVoice,
    coHostVoice,
    targetDuration,
    instructions,
    updateMutation,
  ]);

  const discardChanges = useCallback(() => {
    hasUserEditsRef.current = false;
    setHostVoiceInternal(podcast?.hostVoice ?? 'Aoede');
    setCoHostVoiceInternal(podcast?.coHostVoice ?? 'Charon');
    setTargetDurationInternal(podcast?.targetDurationMinutes ?? 5);
    setInstructionsInternal(podcast?.promptInstructions ?? '');
  }, [podcast]);

  return useMemo(
    () => ({
      // Current values
      hostVoice,
      coHostVoice,
      targetDuration,
      instructions,

      // Setters
      setHostVoice,
      setCoHostVoice,
      setTargetDuration,
      setInstructions,

      // State
      hasChanges,
      hasScriptSettingsChanges,
      isSaving: updateMutation.isPending,

      // Actions
      saveSettings,
      discardChanges,
    }),
    [
      hostVoice,
      coHostVoice,
      targetDuration,
      instructions,
      setHostVoice,
      setCoHostVoice,
      setTargetDuration,
      setInstructions,
      hasChanges,
      hasScriptSettingsChanges,
      updateMutation.isPending,
      saveSettings,
      discardChanges,
    ],
  );
}
