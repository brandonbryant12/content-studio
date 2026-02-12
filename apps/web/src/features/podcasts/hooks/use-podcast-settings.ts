import { useMutation } from '@tanstack/react-query';
import { useReducer, useCallback, useMemo, useEffect, useRef } from 'react';
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

interface SettingsState {
  hostVoice: string;
  coHostVoice: string;
  targetDuration: number;
  instructions: string;
  hasUserEdits: boolean;
}

type SettingsAction =
  | { type: 'SET_HOST_VOICE'; value: string }
  | { type: 'SET_COHOST_VOICE'; value: string }
  | { type: 'SET_DURATION'; value: number }
  | { type: 'SET_INSTRUCTIONS'; value: string }
  | { type: 'SYNC_SERVER'; values: Omit<SettingsState, 'hasUserEdits'> }
  | { type: 'RESET'; values: Omit<SettingsState, 'hasUserEdits'> }
  | { type: 'CLEAR_USER_EDITS' };

function settingsReducer(
  state: SettingsState,
  action: SettingsAction,
): SettingsState {
  switch (action.type) {
    case 'SET_HOST_VOICE':
      return { ...state, hostVoice: action.value, hasUserEdits: true };
    case 'SET_COHOST_VOICE':
      return { ...state, coHostVoice: action.value, hasUserEdits: true };
    case 'SET_DURATION':
      return { ...state, targetDuration: action.value, hasUserEdits: true };
    case 'SET_INSTRUCTIONS':
      return { ...state, instructions: action.value, hasUserEdits: true };
    case 'SYNC_SERVER':
      if (state.hasUserEdits) return state;
      return { ...state, ...action.values };
    case 'RESET':
      return { ...action.values, hasUserEdits: false };
    case 'CLEAR_USER_EDITS':
      return { ...state, hasUserEdits: false };
  }
}

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
  const podcastIdRef = useRef(podcast?.id);

  const [state, dispatch] = useReducer(settingsReducer, podcast, (p) => ({
    ...getInitialValues(p),
    hasUserEdits: false,
  }));

  // Reset on navigation to a different podcast
  if (podcast?.id !== podcastIdRef.current) {
    podcastIdRef.current = podcast?.id;
    dispatch({ type: 'RESET', values: getInitialValues(podcast) });
  }

  // Sync from server when data changes externally (wizard saves, SSE updates)
  useEffect(() => {
    dispatch({
      type: 'SYNC_SERVER',
      values: getInitialValues(podcast),
    });
  }, [
    podcast?.hostVoice,
    podcast?.coHostVoice,
    podcast?.targetDurationMinutes,
    podcast?.promptInstructions,
  ]);

  const setHostVoice = useCallback((value: string) => {
    dispatch({ type: 'SET_HOST_VOICE', value });
  }, []);

  const setCoHostVoice = useCallback((value: string) => {
    dispatch({ type: 'SET_COHOST_VOICE', value });
  }, []);

  const setTargetDuration = useCallback((value: number) => {
    dispatch({ type: 'SET_DURATION', value });
  }, []);

  const setInstructions = useCallback((value: string) => {
    dispatch({ type: 'SET_INSTRUCTIONS', value });
  }, []);

  // Derive hasChanges by comparing current state to server data
  const serverValues = getInitialValues(podcast);

  const hasScriptSettingsChanges =
    state.targetDuration !== serverValues.targetDuration ||
    state.instructions !== serverValues.instructions;

  const hasChanges =
    state.hostVoice !== serverValues.hostVoice ||
    state.coHostVoice !== serverValues.coHostVoice ||
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

    const hostVoiceInfo = VOICES.find((v) => v.id === state.hostVoice);
    const coHostVoiceInfo = VOICES.find((v) => v.id === state.coHostVoice);

    await updateMutation.mutateAsync({
      id: podcast.id,
      hostVoice: state.hostVoice,
      hostVoiceName: hostVoiceInfo?.name,
      coHostVoice: state.coHostVoice,
      coHostVoiceName: coHostVoiceInfo?.name,
      targetDurationMinutes: state.targetDuration,
      promptInstructions: state.instructions || undefined,
    });

    dispatch({ type: 'CLEAR_USER_EDITS' });
  }, [
    podcast,
    state.hostVoice,
    state.coHostVoice,
    state.targetDuration,
    state.instructions,
    updateMutation,
  ]);

  const discardChanges = useCallback(() => {
    dispatch({ type: 'RESET', values: getInitialValues(podcast) });
  }, [podcast]);

  return useMemo(
    () => ({
      hostVoice: state.hostVoice,
      coHostVoice: state.coHostVoice,
      targetDuration: state.targetDuration,
      instructions: state.instructions,
      setHostVoice,
      setCoHostVoice,
      setTargetDuration,
      setInstructions,
      hasChanges,
      hasScriptSettingsChanges,
      isSaving: updateMutation.isPending,
      saveSettings,
      discardChanges,
    }),
    [
      state.hostVoice,
      state.coHostVoice,
      state.targetDuration,
      state.instructions,
      hasChanges,
      hasScriptSettingsChanges,
      updateMutation.isPending,
      saveSettings,
      discardChanges,
    ],
  );
}
