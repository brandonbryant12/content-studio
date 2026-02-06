// features/voiceovers/components/workbench/audio-stage.tsx

import { PlayIcon, PauseIcon } from '@radix-ui/react-icons';
import { cn } from '@repo/ui/lib/utils';
import { useRef, useState, useEffect, useCallback, type RefObject } from 'react';

/**
 * Throttle audio timeupdate to ~1Hz state updates.
 * The browser fires timeupdate ~4/sec; since we display seconds only,
 * we skip setState until the floored second changes.
 */
function useThrottledTime(audioRef: RefObject<HTMLAudioElement | null>) {
  const [displayTime, setDisplayTime] = useState(0);
  const lastSecondRef = useRef(-1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const sec = Math.floor(audio.currentTime);
      if (sec !== lastSecondRef.current) {
        lastSecondRef.current = sec;
        setDisplayTime(audio.currentTime);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [audioRef]);

  return displayTime;
}

interface AudioStageProps {
  src: string;
  duration?: number | null;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Custom audio player with theatrical design.
 * Features animated waveform bars and glowing progress spotlight.
 */
export function AudioStage({
  src,
  duration: initialDuration,
}: AudioStageProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const currentTime = useThrottledTime(audioRef);
  const [duration, setDuration] = useState(initialDuration ?? 0);
  const [isLoaded, setIsLoaded] = useState(false);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Sync with audio element (excluding timeupdate, handled by useThrottledTime)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
    };
    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  // Reset when src changes
  useEffect(() => {
    setIsPlaying(false);
    setIsLoaded(false);
    if (initialDuration) {
      setDuration(initialDuration);
    }
  }, [src, initialDuration]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  }, [isPlaying]);

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || !isLoaded) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * duration;
      audio.currentTime = newTime;
    },
    [duration, isLoaded],
  );

  // Generate waveform bars (25 bars)
  const waveformBars = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div className={cn('stage', isPlaying && 'stage-performing')}>
      {/* Hidden audio element */}
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Decorative waveform */}
      <div className="stage-waveform" aria-hidden="true">
        {waveformBars.map((i) => (
          <div
            key={i}
            className="stage-waveform-bar"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="stage-controls">
        <button
          type="button"
          className="stage-play-btn"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <PauseIcon className="w-6 h-6" />
          ) : (
            <PlayIcon className="w-6 h-6 ml-0.5" />
          )}
        </button>

        <span className="stage-time">{formatTime(currentTime)}</span>

        <div
          className="stage-progress"
          onClick={seek}
          role="slider"
          aria-label="Audio progress"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
        >
          <div className="stage-track" />
          <div className="stage-spotlight" style={{ width: `${progress}%` }} />
        </div>

        <span className="stage-time">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
