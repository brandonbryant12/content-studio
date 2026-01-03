// features/voiceovers/hooks/use-voiceover-settings.ts

import { useMutation } from '@tanstack/react-query';
import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';
import { VOICES } from '../lib/voices';

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

// Get initial values from voiceover or defaults
function getInitialValues(voiceover: VoiceoverFull | undefined) {
  return {
    text: voiceover?.text ?? '',
    voice: voiceover?.voice ?? 'Charon', // default is Charon per schema
  };
}

export function useVoiceoverSettings({
  voiceover,
}: UseVoiceoverSettingsOptions): UseVoiceoverSettingsReturn {
  // Track the voiceover ID to detect navigation
  const voiceoverIdRef = useRef(voiceover?.id);

  // Track whether user has made local edits
  const hasUserEditsRef = useRef(false);

  // Initialize state
  const initial = getInitialValues(voiceover);
  const [text, setTextInternal] = useState(initial.text);
  const [voice, setVoiceInternal] = useState(initial.voice);

  // Wrapped setters that track user edits
  const setText = useCallback((value: string) => {
    hasUserEditsRef.current = true;
    setTextInternal(value);
  }, []);

  const setVoice = useCallback((value: string) => {
    hasUserEditsRef.current = true;
    setVoiceInternal(value);
  }, []);

  // Reset state when navigating to a different voiceover
  if (voiceover?.id !== voiceoverIdRef.current) {
    voiceoverIdRef.current = voiceover?.id;
    hasUserEditsRef.current = false;
    const newInitial = getInitialValues(voiceover);
    setTextInternal(newInitial.text);
    setVoiceInternal(newInitial.voice);
  }

  // Sync local state when server data changes externally
  useEffect(() => {
    if (hasUserEditsRef.current) return;

    const newInitial = getInitialValues(voiceover);
    setTextInternal(newInitial.text);
    setVoiceInternal(newInitial.voice);
  }, [voiceover?.text, voiceover?.voice]);

  // Track if there are changes
  const hasChanges =
    text !== (voiceover?.text ?? '') ||
    voice !== (voiceover?.voice ?? 'Charon');

  const updateMutation = useMutation(
    apiClient.voiceovers.update.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to save settings'));
      },
    }),
  );

  const saveSettings = useCallback(async () => {
    if (!voiceover?.id) return;

    const voiceInfo = VOICES.find((v) => v.id === voice);

    await updateMutation.mutateAsync({
      id: voiceover.id,
      text,
      voice,
      voiceName: voiceInfo?.name,
    });

    // Reset user edits after saving
    hasUserEditsRef.current = false;
  }, [voiceover?.id, text, voice, updateMutation]);

  const discardChanges = useCallback(() => {
    hasUserEditsRef.current = false;
    setTextInternal(voiceover?.text ?? '');
    setVoiceInternal(voiceover?.voice ?? 'Charon');
  }, [voiceover]);

  return {
    text,
    voice,
    setText,
    setVoice,
    hasChanges,
    isSaving: updateMutation.isPending,
    saveSettings,
    discardChanges,
  };
}
