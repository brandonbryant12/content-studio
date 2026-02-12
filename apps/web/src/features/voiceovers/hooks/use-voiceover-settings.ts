import { useMutation } from '@tanstack/react-query';
import { useReducer, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { VOICES } from '../lib/voices';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

type VoiceoverFull = RouterOutput['voiceovers']['get'];

interface UseVoiceoverSettingsOptions {
  voiceover: VoiceoverFull | undefined;
}

export interface UseVoiceoverSettingsReturn {
  // Current values
  text: string;
  voice: string;

  // Setters
  setText: (text: string) => void;
  setVoice: (voice: string) => void;

  // State
  hasChanges: boolean;
  isSaving: boolean;

  // Actions
  saveSettings: () => Promise<void>;
  discardChanges: () => void;
}

interface SettingsState {
  text: string;
  voice: string;
  hasUserEdits: boolean;
}

type SettingsAction =
  | { type: 'SET_TEXT'; value: string }
  | { type: 'SET_VOICE'; value: string }
  | { type: 'SYNC_SERVER'; text: string; voice: string }
  | { type: 'RESET'; text: string; voice: string };

function settingsReducer(
  state: SettingsState,
  action: SettingsAction,
): SettingsState {
  switch (action.type) {
    case 'SET_TEXT':
      return { ...state, text: action.value, hasUserEdits: true };
    case 'SET_VOICE':
      return { ...state, voice: action.value, hasUserEdits: true };
    case 'SYNC_SERVER':
      if (state.hasUserEdits) return state;
      return { text: action.text, voice: action.voice, hasUserEdits: false };
    case 'RESET':
      return { text: action.text, voice: action.voice, hasUserEdits: false };
  }
}

function getServerValues(voiceover: VoiceoverFull | undefined) {
  return {
    text: voiceover?.text ?? '',
    voice: voiceover?.voice ?? 'Charon',
  };
}

export function useVoiceoverSettings({
  voiceover,
}: UseVoiceoverSettingsOptions): UseVoiceoverSettingsReturn {
  const server = getServerValues(voiceover);

  const [state, dispatch] = useReducer(settingsReducer, {
    text: server.text,
    voice: server.voice,
    hasUserEdits: false,
  });

  // Reset on navigation to a different voiceover
  const voiceoverIdRef = useRef(voiceover?.id);
  if (voiceover?.id !== voiceoverIdRef.current) {
    voiceoverIdRef.current = voiceover?.id;
    dispatch({ type: 'RESET', text: server.text, voice: server.voice });
  }

  // Sync from server when data changes externally (SSE, cache invalidation)
  useEffect(() => {
    dispatch({ type: 'SYNC_SERVER', text: server.text, voice: server.voice });
  }, [server.text, server.voice]);

  // Derived hasChanges
  const hasChanges = state.text !== server.text || state.voice !== server.voice;

  const setText = useCallback(
    (value: string) => dispatch({ type: 'SET_TEXT', value }),
    [],
  );

  const setVoice = useCallback(
    (value: string) => dispatch({ type: 'SET_VOICE', value }),
    [],
  );

  const updateMutation = useMutation(
    apiClient.voiceovers.update.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to save settings'));
      },
    }),
  );

  const voiceoverId = voiceover?.id;

  const saveSettings = useCallback(async () => {
    if (!voiceoverId) return;

    const voiceInfo = VOICES.find((v) => v.id === state.voice);

    await updateMutation.mutateAsync({
      id: voiceoverId,
      text: state.text,
      voice: state.voice,
      voiceName: voiceInfo?.name,
    });

    dispatch({
      type: 'RESET',
      text: state.text,
      voice: state.voice,
    });
  }, [voiceoverId, state.text, state.voice, updateMutation]);

  const discardChanges = useCallback(() => {
    dispatch({ type: 'RESET', text: server.text, voice: server.voice });
  }, [server.text, server.voice]);

  return {
    text: state.text,
    voice: state.voice,
    setText,
    setVoice,
    hasChanges,
    isSaving: updateMutation.isPending,
    saveSettings,
    discardChanges,
  };
}
