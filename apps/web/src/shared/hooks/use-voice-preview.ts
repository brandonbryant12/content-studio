import { useRef, useState, useEffect, useCallback } from 'react';

export interface UseVoicePreviewReturn {
  playingVoiceId: string | null;
  play: (voiceId: string, url: string) => void;
  stop: () => void;
}

export function useVoicePreview(): UseVoicePreviewReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const playingRef = useRef<string | null>(null);
  playingRef.current = playingVoiceId;

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audioRef.current = audio;

    const handleEnded = () => setPlayingVoiceId(null);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('ended', handleEnded);
      audioRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlayingVoiceId(null);
  }, []);

  const play = useCallback(
    (voiceId: string, url: string) => {
      const audio = audioRef.current;
      if (!audio) return;

      // If same voice is playing, toggle off
      if (playingRef.current === voiceId) {
        stop();
        return;
      }

      // Stop current, start new
      audio.pause();
      audio.currentTime = 0;
      audio.src = url;
      audio.load();
      setPlayingVoiceId(voiceId);

      const onCanPlay = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.play().catch(() => {});
      };
      audio.addEventListener('canplay', onCanPlay);
    },
    [stop],
  );

  return { playingVoiceId, play, stop };
}
