import { PauseIcon, PlayIcon, SpeakerLoudIcon } from '@radix-ui/react-icons';
import { useRef, useState } from 'react';
import { useAudioPlayer, formatTime } from '@/shared/hooks/use-audio-player';

interface AudioPlayerProps {
  url: string;
}

// Generate static waveform bars for visual effect
const WAVEFORM_BARS = 40;
const generateWaveformHeights = () => {
  return Array.from({ length: WAVEFORM_BARS }, (_, i) => {
    const position = i / WAVEFORM_BARS;
    const base = Math.sin(position * Math.PI) * 0.5 + 0.3;
    const variation =
      Math.sin(position * 12) * 0.15 + Math.sin(position * 7) * 0.1;
    const random = Math.random() * 0.15;
    return Math.max(0.15, Math.min(1, base + variation + random));
  });
};

export function AudioPlayer({ url }: AudioPlayerProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const [waveformHeights] = useState(generateWaveformHeights);
  const { audioRef, isPlaying, currentTime, duration, progress, togglePlay, seek, handleSliderKeyDown } =
    useAudioPlayer(url);

  return (
    <div className="audio-player">
      <audio ref={audioRef} src={url} preload="metadata" />

      <button
        type="button"
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

      <div className="audio-player-main">
        <div
          ref={progressRef}
          className="audio-player-waveform"
          onClick={seek}
          onKeyDown={handleSliderKeyDown}
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

        <div className="audio-player-time">
          <span className="audio-player-current">
            {formatTime(currentTime)}
          </span>
          <span className="audio-player-separator">/</span>
          <span className="audio-player-duration">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="audio-player-volume">
        <SpeakerLoudIcon className="w-4 h-4" />
      </div>
    </div>
  );
}
