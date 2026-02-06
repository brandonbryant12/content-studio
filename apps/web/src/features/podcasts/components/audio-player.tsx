import { PauseIcon, PlayIcon, SpeakerLoudIcon } from '@radix-ui/react-icons';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

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

interface AudioPlayerProps {
  url: string;
}

// Generate static waveform bars for visual effect
const WAVEFORM_BARS = 40;
const generateWaveformHeights = () => {
  // Create a pattern that looks like audio - higher in middle, lower at edges
  return Array.from({ length: WAVEFORM_BARS }, (_, i) => {
    const position = i / WAVEFORM_BARS;
    // Create organic-looking variation with multiple sine waves
    const base = Math.sin(position * Math.PI) * 0.5 + 0.3;
    const variation =
      Math.sin(position * 12) * 0.15 + Math.sin(position * 7) * 0.1;
    const random = Math.random() * 0.15;
    return Math.max(0.15, Math.min(1, base + variation + random));
  });
};

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function AudioPlayer({ url }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const currentTime = useThrottledTime(audioRef);
  const [duration, setDuration] = useState(0);
  const [waveformHeights] = useState(generateWaveformHeights);

  // Handle audio events (excluding timeupdate, handled by useThrottledTime)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadedmetadata', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('loadedmetadata', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  }, [isPlaying]);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      const progress = progressRef.current;
      if (!audio || !progress || !duration) return;

      const rect = progress.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      audio.currentTime = percentage * duration;
    },
    [duration],
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="audio-player">
      {/* Hidden audio element */}
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className="audio-player-play-btn"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <PauseIcon className="w-5 h-5" />
        ) : (
          <PlayIcon className="w-5 h-5" />
        )}
      </button>

      {/* Waveform & Progress */}
      <div className="audio-player-main">
        <div
          ref={progressRef}
          className="audio-player-waveform"
          onClick={handleSeek}
          role="slider"
          aria-label="Seek audio"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          tabIndex={0}
        >
          {waveformHeights.map((height, i) => {
            const barProgress = (i / WAVEFORM_BARS) * 100;
            const isActive = barProgress <= progress;
            return (
              <div
                key={i}
                className={`audio-player-bar ${isActive ? 'active' : ''} ${isPlaying && isActive ? 'playing' : ''}`}
                style={{ height: `${height * 100}%` }}
              />
            );
          })}
        </div>

        {/* Time Display */}
        <div className="audio-player-time">
          <span className="audio-player-current">
            {formatTime(currentTime)}
          </span>
          <span className="audio-player-separator">/</span>
          <span className="audio-player-duration">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume Icon (decorative) */}
      <div className="audio-player-volume">
        <SpeakerLoudIcon className="w-4 h-4" />
      </div>
    </div>
  );
}
