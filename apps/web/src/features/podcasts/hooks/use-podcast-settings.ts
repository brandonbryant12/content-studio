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
  hostPersonaId: string | null;
  coHostPersonaId: string | null;
  audienceSegmentId: string | null;

  // Setters
  setHostVoice: (voice: string) => void;
  setCoHostVoice: (voice: string) => void;
  setTargetDuration: (duration: number) => void;
  setInstructions: (instructions: string) => void;
  setHostPersonaId: (id: string | null) => void;
  setCoHostPersonaId: (id: string | null) => void;
  setAudienceSegmentId: (id: string | null) => void;

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
    hostPersonaId: podcast?.hostPersonaId ?? null,
    coHostPersonaId: podcast?.coHostPersonaId ?? null,
    audienceSegmentId: podcast?.audienceSegmentId ?? null,
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
  const [hostPersonaId, setHostPersonaIdInternal] = useState<string | null>(
    initial.hostPersonaId,
  );
  const [coHostPersonaId, setCoHostPersonaIdInternal] = useState<string | null>(
    initial.coHostPersonaId,
  );
  const [audienceSegmentId, setAudienceSegmentIdInternal] = useState<
    string | null
  >(initial.audienceSegmentId);

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

  const setHostPersonaId = useCallback((value: string | null) => {
    hasUserEditsRef.current = true;
    setHostPersonaIdInternal(value);
  }, []);

  const setCoHostPersonaId = useCallback((value: string | null) => {
    hasUserEditsRef.current = true;
    setCoHostPersonaIdInternal(value);
  }, []);

  const setAudienceSegmentId = useCallback((value: string | null) => {
    hasUserEditsRef.current = true;
    setAudienceSegmentIdInternal(value);
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
    setHostPersonaIdInternal(newInitial.hostPersonaId);
    setCoHostPersonaIdInternal(newInitial.coHostPersonaId);
    setAudienceSegmentIdInternal(newInitial.audienceSegmentId);
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
    setHostPersonaIdInternal(newInitial.hostPersonaId);
    setCoHostPersonaIdInternal(newInitial.coHostPersonaId);
    setAudienceSegmentIdInternal(newInitial.audienceSegmentId);
  }, [
    podcast?.hostVoice,
    podcast?.coHostVoice,
    podcast?.targetDurationMinutes,
    podcast?.promptInstructions,
    podcast?.hostPersonaId,
    podcast?.coHostPersonaId,
    podcast?.audienceSegmentId,
  ]);

  // Track if script-affecting settings changed (requires script regeneration)
  const hasScriptSettingsChanges =
    targetDuration !== (podcast?.targetDurationMinutes ?? 5) ||
    instructions !== (podcast?.promptInstructions ?? '') ||
    hostPersonaId !== (podcast?.hostPersonaId ?? null) ||
    coHostPersonaId !== (podcast?.coHostPersonaId ?? null) ||
    audienceSegmentId !== (podcast?.audienceSegmentId ?? null);

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
      hostPersonaId: hostPersonaId ?? undefined,
      coHostPersonaId: coHostPersonaId ?? undefined,
      audienceSegmentId: audienceSegmentId ?? undefined,
    });
  }, [
    podcast?.id,
    hostVoice,
    coHostVoice,
    targetDuration,
    instructions,
    hostPersonaId,
    coHostPersonaId,
    audienceSegmentId,
    updateMutation,
  ]);

  const discardChanges = useCallback(() => {
    hasUserEditsRef.current = false;
    setHostVoiceInternal(podcast?.hostVoice ?? 'Aoede');
    setCoHostVoiceInternal(podcast?.coHostVoice ?? 'Charon');
    setTargetDurationInternal(podcast?.targetDurationMinutes ?? 5);
    setInstructionsInternal(podcast?.promptInstructions ?? '');
    setHostPersonaIdInternal(podcast?.hostPersonaId ?? null);
    setCoHostPersonaIdInternal(podcast?.coHostPersonaId ?? null);
    setAudienceSegmentIdInternal(podcast?.audienceSegmentId ?? null);
  }, [podcast]);

  return useMemo(
    () => ({
      // Current values
      hostVoice,
      coHostVoice,
      targetDuration,
      instructions,
      hostPersonaId,
      coHostPersonaId,
      audienceSegmentId,

      // Setters
      setHostVoice,
      setCoHostVoice,
      setTargetDuration,
      setInstructions,
      setHostPersonaId,
      setCoHostPersonaId,
      setAudienceSegmentId,

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
      hostPersonaId,
      coHostPersonaId,
      audienceSegmentId,
      setHostVoice,
      setCoHostVoice,
      setTargetDuration,
      setInstructions,
      setHostPersonaId,
      setCoHostPersonaId,
      setAudienceSegmentId,
      hasChanges,
      hasScriptSettingsChanges,
      updateMutation.isPending,
      saveSettings,
      discardChanges,
    ],
  );
}
