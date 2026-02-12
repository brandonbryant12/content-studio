import { PlayIcon, PauseIcon } from '@radix-ui/react-icons';
import { cn } from '@repo/ui/lib/utils';
import { useAudioPlayer, formatTime } from '@/shared/hooks/use-audio-player';

interface AudioStageProps {
  src: string;
  duration?: number | null;
}

/**
 * Custom audio player with theatrical design.
 * Features animated waveform bars and glowing progress spotlight.
 */
export function AudioStage({
  src,
  duration: initialDuration,
}: AudioStageProps) {
  const {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    progress,
    togglePlay,
    seek,
    handleSliderKeyDown,
  } = useAudioPlayer(src, initialDuration);

  // Generate waveform bars (25 bars)
  const waveformBars = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div className={cn('stage', isPlaying && 'stage-performing')}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="stage-waveform" aria-hidden="true">
        {waveformBars.map((i) => (
          <div
            key={i}
            className="stage-waveform-bar"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>

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
          onKeyDown={handleSliderKeyDown}
          role="slider"
          aria-label="Audio progress"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
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
