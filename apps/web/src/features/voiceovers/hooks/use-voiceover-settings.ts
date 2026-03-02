import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useReducer, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { VOICES } from '../lib/voices';
import { getVoiceoverQueryKey } from './use-voiceover';
import { getVoiceoverListQueryKey } from './use-voiceover-list';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

type VoiceoverFull = RouterOutput['voiceovers']['get'];

interface UseVoiceoverSettingsOptions {
  voiceover: VoiceoverFull | undefined;
}

export interface UseVoiceoverSettingsReturn {
  // Current values
  title: string;
  text: string;
  voice: string;

  // Setters
  setTitle: (title: string) => void;
  setText: (text: string) => void;
  setVoice: (voice: string) => void;

  // State
  hasTitleChanges: boolean;
  hasChanges: boolean;
  isSaving: boolean;

  // Actions
  saveSettings: () => Promise<void>;
  discardChanges: () => void;
}

interface SettingsState {
  title: string;
  text: string;
  voice: string;
  hasUserEdits: boolean;
}

type SettingsAction =
  | { type: 'SET_TITLE'; value: string }
  | { type: 'SET_TEXT'; value: string }
  | { type: 'SET_VOICE'; value: string }
  | { type: 'SYNC_SERVER'; title: string; text: string; voice: string }
  | { type: 'RESET'; title: string; text: string; voice: string };

function settingsReducer(
  state: SettingsState,
  action: SettingsAction,
): SettingsState {
  switch (action.type) {
    case 'SET_TITLE':
      return { ...state, title: action.value, hasUserEdits: true };
    case 'SET_TEXT':
      return { ...state, text: action.value, hasUserEdits: true };
    case 'SET_VOICE':
      return { ...state, voice: action.value, hasUserEdits: true };
    case 'SYNC_SERVER':
      if (state.hasUserEdits) return state;
      return {
        title: action.title,
        text: action.text,
        voice: action.voice,
        hasUserEdits: false,
      };
    case 'RESET':
      return {
        title: action.title,
        text: action.text,
        voice: action.voice,
        hasUserEdits: false,
      };
  }
}

function getServerValues(voiceover: VoiceoverFull | undefined) {
  return {
    title: voiceover?.title ?? '',
    text: voiceover?.text ?? '',
    voice: voiceover?.voice ?? 'Charon',
  };
}

export function useVoiceoverSettings({
  voiceover,
}: UseVoiceoverSettingsOptions): UseVoiceoverSettingsReturn {
  const queryClient = useQueryClient();
  const server = getServerValues(voiceover);

  const [state, dispatch] = useReducer(settingsReducer, {
    title: server.title,
    text: server.text,
    voice: server.voice,
    hasUserEdits: false,
  });

  // Reset on navigation to a different voiceover
  const voiceoverIdRef = useRef(voiceover?.id);
  if (voiceover?.id !== voiceoverIdRef.current) {
    voiceoverIdRef.current = voiceover?.id;
    dispatch({
      type: 'RESET',
      title: server.title,
      text: server.text,
      voice: server.voice,
    });
  }

  // Sync from server when data changes externally (SSE, cache invalidation)
  useEffect(() => {
    dispatch({
      type: 'SYNC_SERVER',
      title: server.title,
      text: server.text,
      voice: server.voice,
    });
  }, [server.title, server.text, server.voice]);

  // Derived hasChanges
  const hasTitleChanges = state.title.trim() !== server.title;
  const hasChanges =
    hasTitleChanges || state.text !== server.text || state.voice !== server.voice;

  const setTitle = useCallback(
    (value: string) => dispatch({ type: 'SET_TITLE', value }),
    [],
  );

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
      onSuccess: (updated) => {
        if (!voiceoverId) return;

        queryClient.setQueryData(getVoiceoverQueryKey(voiceoverId), updated);

        queryClient.setQueryData(
          getVoiceoverListQueryKey(),
          (current: RouterOutput['voiceovers']['list'] | undefined) =>
            current?.map((item) => (item.id === updated.id ? updated : item)),
        );

        queryClient.setQueryData(
          getVoiceoverListQueryKey({ limit: 4 }),
          (current: RouterOutput['voiceovers']['list'] | undefined) =>
            current?.map((item) => (item.id === updated.id ? updated : item)),
        );
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to save settings'));
      },
    }),
  );

  const voiceoverId = voiceover?.id;

  const saveSettings = useCallback(async () => {
    if (!voiceoverId) return;

    const voiceInfo = VOICES.find((v) => v.id === state.voice);

    const updated = await updateMutation.mutateAsync({
      id: voiceoverId,
      title: state.title.trim(),
      text: state.text,
      voice: state.voice,
      voiceName: voiceInfo?.name,
    });

    const nextServer = getServerValues(updated);
    dispatch({
      type: 'RESET',
      title: nextServer.title,
      text: nextServer.text,
      voice: nextServer.voice,
    });
  }, [voiceoverId, state.title, state.text, state.voice, updateMutation]);

  const discardChanges = useCallback(() => {
    dispatch({
      type: 'RESET',
      title: server.title,
      text: server.text,
      voice: server.voice,
    });
  }, [server.title, server.text, server.voice]);

  return {
    title: state.title,
    text: state.text,
    voice: state.voice,
    setTitle,
    setText,
    setVoice,
    hasTitleChanges,
    hasChanges,
    isSaving: updateMutation.isPending,
    saveSettings,
    discardChanges,
  };
}
