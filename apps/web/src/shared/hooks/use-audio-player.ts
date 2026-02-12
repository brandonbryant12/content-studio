import { useRef, useState, useEffect, useCallback } from 'react';

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export interface UseAudioPlayerReturn {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  isLoaded: boolean;
  togglePlay: () => void;
  seek: (e: React.MouseEvent<HTMLElement>) => void;
  handleSliderKeyDown: (e: React.KeyboardEvent) => void;
}

export function useAudioPlayer(
  src: string,
  initialDuration?: number | null,
): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const lastSecondRef = useRef(-1);
  const [duration, setDuration] = useState(initialDuration ?? 0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);
  const [prevInitialDuration, setPrevInitialDuration] =
    useState(initialDuration);

  const progress = duration > 0 ? (displayTime / duration) * 100 : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    /**
     * Throttle audio timeupdate to ~1Hz state updates.
     * The browser fires timeupdate ~4/sec; since we display seconds only,
     * we skip setState until the floored second changes.
     */
    const handleTimeUpdate = () => {
      const sec = Math.floor(audio.currentTime);
      if (sec !== lastSecondRef.current) {
        lastSecondRef.current = sec;
        setDisplayTime(audio.currentTime);
      }
    };
    const handleDurationChange = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
    };
    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadedmetadata', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('loadedmetadata', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  // Reset when src or initialDuration changes (adjust state during render)
  if (src !== prevSrc || initialDuration !== prevInitialDuration) {
    setPrevSrc(src);
    setPrevInitialDuration(initialDuration);
    setDisplayTime(0);
    setIsPlaying(false);
    setIsLoaded(false);
    if (initialDuration) {
      setDuration(initialDuration);
    }
  }

  // Reset throttle ref when src changes
  useEffect(() => {
    lastSecondRef.current = -1;
  }, [src]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {
        // Source unavailable or not yet loaded
        setIsPlaying(false);
      });
    }
  }, [isPlaying, src]);

  const seek = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      audio.currentTime = percentage * duration;
    },
    [duration],
  );

  const handleSliderKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;

      const step = e.shiftKey ? 10 : 5;
      let newTime = audio.currentTime;

      if (e.key === 'ArrowRight') {
        newTime = Math.min(duration, audio.currentTime + step);
      } else if (e.key === 'ArrowLeft') {
        newTime = Math.max(0, audio.currentTime - step);
      } else {
        return;
      }

      e.preventDefault();
      audio.currentTime = newTime;
    },
    [duration],
  );

  return {
    audioRef,
    isPlaying,
    currentTime: displayTime,
    duration,
    progress,
    isLoaded,
    togglePlay,
    seek,
    handleSliderKeyDown,
  };
}
