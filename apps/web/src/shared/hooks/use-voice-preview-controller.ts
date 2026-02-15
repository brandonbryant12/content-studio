import { useMemo, useCallback } from 'react';
import { useVoicePreview } from './use-voice-preview';
import { useVoices } from './use-voices';

export interface UseVoicePreviewControllerReturn {
  playingVoiceId: string | null;
  previewUrls: Record<string, string>;
  togglePreview: (voiceId: string) => void;
}

export function useVoicePreviewController(): UseVoicePreviewControllerReturn {
  const { data: voicesData } = useVoices();
  const { playingVoiceId, play, stop } = useVoicePreview();

  const previewUrls = useMemo(
    () =>
      voicesData
        ? Object.fromEntries(
            voicesData
              .filter(
                (voice): voice is typeof voice & { previewUrl: string } =>
                  typeof voice.previewUrl === 'string' &&
                  voice.previewUrl.length > 0,
              )
              .map((voice) => [voice.id, voice.previewUrl]),
          )
        : {},
    [voicesData],
  );

  const togglePreview = useCallback(
    (voiceId: string) => {
      if (playingVoiceId === voiceId) {
        stop();
        return;
      }

      const previewUrl = previewUrls[voiceId];
      if (previewUrl) {
        play(voiceId, previewUrl);
      }
    },
    [playingVoiceId, play, previewUrls, stop],
  );

  return {
    playingVoiceId,
    previewUrls,
    togglePreview,
  };
}
