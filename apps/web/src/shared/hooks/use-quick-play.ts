import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { formatTime } from './use-audio-player';

export interface UseQuickPlayReturn {
  /** ID of the currently playing item, or null */
  playingId: string | null;
  /** Current playback time in seconds */
  currentTime: number;
  /** Duration in seconds */
  duration: number;
  /** Whether audio is actively playing */
  isPlaying: boolean;
  /** Toggle play/pause for a given item */
  toggle: (id: string, audioUrl: string) => void;
  /** Stop playback entirely */
  stop: () => void;
  /** Format seconds as M:SS */
  formatTime: typeof formatTime;
}

/**
 * Lightweight hook for quick-play in list views.
 * Only one item plays at a time — toggling a different item stops the current one.
 * Uses a single shared Audio element to minimize resource usage.
 *
 * toggle/stop are stable references (use refs internally) so the returned
 * object only changes identity when playingId, isPlaying, currentTime, or
 * duration actually change — preventing unnecessary child re-renders.
 */
export function useQuickPlay(): UseQuickPlayReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const lastSecondRef = useRef(-1);

  // Refs so toggle/stop closures stay stable
  const playingIdRef = useRef(playingId);
  const isPlayingRef = useRef(isPlaying);
  playingIdRef.current = playingId;
  isPlayingRef.current = isPlaying;

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      const sec = Math.floor(audio.currentTime);
      if (sec !== lastSecondRef.current) {
        lastSecondRef.current = sec;
        setDisplayTime(audio.currentTime);
      }
    };
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setPlayingId(null);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadedmetadata', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('loadedmetadata', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audioRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlayingId(null);
    setIsPlaying(false);
    setDisplayTime(0);
    setDuration(0);
    lastSecondRef.current = -1;
  }, []);

  const toggle = useCallback(
    (id: string, audioUrl: string) => {
      const audio = audioRef.current;
      if (!audio) return;

      // If same item, toggle pause/play
      if (playingIdRef.current === id) {
        if (isPlayingRef.current) {
          audio.pause();
        } else {
          audio.play().catch(() => {});
        }
        return;
      }

      // Different item — switch source, play once ready
      audio.pause();
      audio.currentTime = 0;
      lastSecondRef.current = -1;
      setDisplayTime(0);
      setDuration(0);
      audio.src = audioUrl;
      audio.load();
      setPlayingId(id);

      // Wait for enough data before playing
      const onCanPlay = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.play().catch(() => {});
      };
      audio.addEventListener('canplay', onCanPlay);
    },
    [], // stable — reads state through refs
  );

  return useMemo(
    () => ({
      playingId,
      currentTime: displayTime,
      duration,
      isPlaying,
      toggle,
      stop,
      formatTime,
    }),
    [playingId, displayTime, duration, isPlaying, toggle, stop],
  );
}
