import { useMutation } from '@tanstack/react-query';
import { useState, useCallback, useRef } from 'react';
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

  // Initialize state from podcast
  const initial = getInitialValues(podcast);
  const [hostVoice, setHostVoice] = useState(initial.hostVoice);
  const [coHostVoice, setCoHostVoice] = useState(initial.coHostVoice);
  const [targetDuration, setTargetDuration] = useState(initial.targetDuration);
  const [instructions, setInstructions] = useState(initial.instructions);

  // Reset state when navigating to a different podcast (not just any podcast change)
  // This runs synchronously during render, not in an effect
  if (podcast?.id !== podcastIdRef.current) {
    podcastIdRef.current = podcast?.id;
    const newInitial = getInitialValues(podcast);
    // Only reset if values haven't been touched yet for this podcast
    // This handles the initial navigation case
    setHostVoice(newInitial.hostVoice);
    setCoHostVoice(newInitial.coHostVoice);
    setTargetDuration(newInitial.targetDuration);
    setInstructions(newInitial.instructions);
  }

  // Track if there are changes compared to the current podcast values
  const hasChanges =
    hostVoice !== (podcast?.hostVoice ?? 'Aoede') ||
    coHostVoice !== (podcast?.coHostVoice ?? 'Charon') ||
    targetDuration !== (podcast?.targetDurationMinutes ?? 5) ||
    instructions !== (podcast?.promptInstructions ?? '');

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
    setHostVoice(podcast?.hostVoice ?? 'Aoede');
    setCoHostVoice(podcast?.coHostVoice ?? 'Charon');
    setTargetDuration(podcast?.targetDurationMinutes ?? 5);
    setInstructions(podcast?.promptInstructions ?? '');
  }, [podcast]);

  return {
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
    isSaving: updateMutation.isPending,

    // Actions
    saveSettings,
    discardChanges,
  };
}
