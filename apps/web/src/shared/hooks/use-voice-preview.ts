import { useRef, useState, useEffect, useCallback, useMemo } from 'react';

export interface UseVoicePreviewReturn {
  /** ID of the voice currently playing, or null */
  playingVoiceId: string | null;
  /** Start playing a voice preview. Stops any currently playing preview. */
  play: (voiceId: string, url: string) => void;
  /** Stop the currently playing preview */
  stop: () => void;
}

/**
 * Manages playing a single voice preview at a time.
 * Uses a single Audio element — stops previous before playing new.
 */
export function useVoicePreview(): UseVoicePreviewReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const playingRef = useRef<string | null>(null);
  useEffect(() => {
    playingRef.current = playingVoiceId;
  }, [playingVoiceId]);

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

  return useMemo(
    () => ({ playingVoiceId, play, stop }),
    [playingVoiceId, play, stop],
  );
}
