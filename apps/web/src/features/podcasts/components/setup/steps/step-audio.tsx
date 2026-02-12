import { Slider } from '@repo/ui/components/slider';
import type { MouseEvent, KeyboardEvent } from 'react';
import { useVoicePreview, useVoices } from '@/shared/hooks';

type PodcastFormat = 'conversation' | 'voiceover' | 'voice_over';

// Voice options - these match the Gemini TTS voices
const VOICES = [
  {
    id: 'Aoede',
    name: 'Aoede',
    gender: 'female',
    description: 'Melodic and engaging',
  },
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'female',
    description: 'Youthful and energetic',
  },
  {
    id: 'Leda',
    name: 'Leda',
    gender: 'female',
    description: 'Friendly and approachable',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'female',
    description: 'Light and airy',
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'male',
    description: 'Clear and professional',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'male',
    description: 'Bold and dynamic',
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'male',
    description: 'Lively and engaging',
  },
  {
    id: 'Orus',
    name: 'Orus',
    gender: 'male',
    description: 'Friendly and conversational',
  },
] as const;

function SetupVoicePreviewBtn({
  voiceId,
  voiceName,
  disabled,
  isPlaying,
  onPreview,
}: {
  voiceId: string;
  voiceName: string;
  disabled?: boolean;
  isPlaying: boolean;
  onPreview: (voiceId: string) => void;
}) {
  return (
    <button
      type="button"
      className={`setup-voice-preview-btn ${isPlaying ? 'playing' : ''}`}
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
        onPreview(voiceId);
      }}
      aria-label={
        isPlaying ? `Stop ${voiceName} preview` : `Preview ${voiceName} voice`
      }
      disabled={disabled}
    >
      {isPlaying ? (
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="setup-voice-preview-icon"
          aria-hidden="true"
        >
          <path d="M5.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75A.75.75 0 0 0 7.25 3h-1.5ZM12.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Z" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="setup-voice-preview-icon"
          aria-hidden="true"
        >
          <path d="M10.5 3.75a.75.75 0 0 0-1.264-.546L5.203 7H3.006a.75.75 0 0 0-.75.75v4.5c0 .414.336.75.75.75h2.197l4.033 3.796A.75.75 0 0 0 10.5 16.25V3.75Z" />
          <path d="M13.26 7.174a.75.75 0 0 1 1.06-.026 4.501 4.501 0 0 1 0 5.704.75.75 0 1 1-1.086-1.034 3.001 3.001 0 0 0 0-3.644.75.75 0 0 1 .026-1Z" />
        </svg>
      )}
    </button>
  );
}

const MIN_DURATION = 1;
const MAX_DURATION = 10;

interface StepAudioProps {
  format: PodcastFormat;
  duration: number;
  hostVoice: string;
  coHostVoice: string;
  onDurationChange: (duration: number) => void;
  onHostVoiceChange: (voice: string) => void;
  onCoHostVoiceChange: (voice: string) => void;
}

interface VoiceCardProps {
  voice: (typeof VOICES)[number];
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (voiceId: string) => void;
  previewUrl: string | null;
  isPlaying: boolean;
  onPreview: (voiceId: string) => void;
}

function VoiceCard({
  voice,
  isSelected,
  isDisabled,
  onSelect,
  previewUrl,
  isPlaying,
  onPreview,
}: VoiceCardProps) {
  const handleClick = () => {
    if (!isDisabled) onSelect(voice.id);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
      e.preventDefault();
      onSelect(voice.id);
    }
  };

  return (
    <div
      role="radio"
      tabIndex={isDisabled ? -1 : 0}
      className={`setup-voice-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-checked={isSelected}
      aria-disabled={isDisabled}
      aria-label={`${voice.name} — ${voice.description}`}
    >
      <div className={`setup-voice-avatar ${voice.gender}`}>
        {voice.name.charAt(0)}
      </div>
      <p className="setup-voice-name">{voice.name}</p>
      <p className="setup-voice-desc">{voice.description}</p>
      <SetupVoicePreviewBtn
        voiceId={voice.id}
        voiceName={voice.name}
        disabled={isDisabled || !previewUrl}
        isPlaying={isPlaying}
        onPreview={onPreview}
      />
    </div>
  );
}

export function StepAudio({
  format,
  duration,
  hostVoice,
  coHostVoice,
  onDurationChange,
  onHostVoiceChange,
  onCoHostVoiceChange,
}: StepAudioProps) {
  const isConversation = format === 'conversation';
  const femaleVoices = VOICES.filter((v) => v.gender === 'female');
  const maleVoices = VOICES.filter((v) => v.gender === 'male');

  const { data: voicesData } = useVoices();
  const { playingVoiceId, play, stop } = useVoicePreview();

  const previewUrls = voicesData
    ? Object.fromEntries(
        voicesData
          .filter((v) => v.previewUrl)
          .map((v) => [v.id, v.previewUrl!]),
      )
    : {};

  const handlePreview = (voiceId: string) => {
    if (playingVoiceId === voiceId) {
      stop();
    } else {
      const url = previewUrls[voiceId];
      if (url) play(voiceId, url);
    }
  };

  return (
    <div className="setup-content">
      <div className="setup-step-header">
        <p className="setup-step-eyebrow">Step 2 of 3</p>
        <h2 className="setup-step-title">Audio Settings</h2>
        <p className="setup-step-description">
          Choose the duration and voice{isConversation ? 's' : ''} for your
          podcast.
        </p>
      </div>

      {/* Duration Selection */}
      <div className="mb-8">
        <label className="setup-label block text-center mb-4">
          Target Duration
        </label>
        <div className="setup-duration-slider">
          <span className="setup-duration-range-label">{MIN_DURATION}</span>
          <Slider
            value={[duration]}
            onValueChange={([value]) =>
              value != null && onDurationChange(value)
            }
            min={MIN_DURATION}
            max={MAX_DURATION}
            step={1}
            aria-label="Target duration in minutes"
          />
          <span className="setup-duration-range-label">{MAX_DURATION}</span>
        </div>
        <div className="setup-duration-value-display">
          <span className="setup-duration-value">{duration}</span>
          <span className="setup-duration-unit">min</span>
        </div>
      </div>

      {/* Host Voice Selection */}
      <div className="setup-voice-section">
        <div className="setup-voice-label">
          {isConversation ? 'Host Voice' : 'Voice'}
          <span className="setup-voice-badge">Primary</span>
        </div>

        {/* Female Voices */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
            Female
          </p>
          <div
            className="setup-voice-grid"
            role="radiogroup"
            aria-label="Female host voices"
          >
            {femaleVoices.map((voice) => (
              <VoiceCard
                key={voice.id}
                voice={voice}
                isSelected={hostVoice === voice.id}
                isDisabled={isConversation && coHostVoice === voice.id}
                onSelect={onHostVoiceChange}
                previewUrl={previewUrls[voice.id] ?? null}
                isPlaying={playingVoiceId === voice.id}
                onPreview={handlePreview}
              />
            ))}
          </div>
        </div>

        {/* Male Voices */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
            Male
          </p>
          <div
            className="setup-voice-grid"
            role="radiogroup"
            aria-label="Male host voices"
          >
            {maleVoices.map((voice) => (
              <VoiceCard
                key={voice.id}
                voice={voice}
                isSelected={hostVoice === voice.id}
                isDisabled={isConversation && coHostVoice === voice.id}
                onSelect={onHostVoiceChange}
                previewUrl={previewUrls[voice.id] ?? null}
                isPlaying={playingVoiceId === voice.id}
                onPreview={handlePreview}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Co-Host Voice Selection (only for conversation format) */}
      {isConversation && (
        <div className="setup-voice-section">
          <div className="setup-voice-label">
            Co-Host Voice
            <span className="setup-voice-badge">Secondary</span>
          </div>

          {/* Female Voices */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
              Female
            </p>
            <div
              className="setup-voice-grid"
              role="radiogroup"
              aria-label="Female co-host voices"
            >
              {femaleVoices.map((voice) => (
                <VoiceCard
                  key={voice.id}
                  voice={voice}
                  isSelected={coHostVoice === voice.id}
                  isDisabled={hostVoice === voice.id}
                  onSelect={onCoHostVoiceChange}
                  previewUrl={previewUrls[voice.id] ?? null}
                  isPlaying={playingVoiceId === voice.id}
                  onPreview={handlePreview}
                />
              ))}
            </div>
          </div>

          {/* Male Voices */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
              Male
            </p>
            <div
              className="setup-voice-grid"
              role="radiogroup"
              aria-label="Male co-host voices"
            >
              {maleVoices.map((voice) => (
                <VoiceCard
                  key={voice.id}
                  voice={voice}
                  isSelected={coHostVoice === voice.id}
                  isDisabled={hostVoice === voice.id}
                  onSelect={onCoHostVoiceChange}
                  previewUrl={previewUrls[voice.id] ?? null}
                  isPlaying={playingVoiceId === voice.id}
                  onPreview={handlePreview}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
