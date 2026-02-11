import type { MouseEvent, KeyboardEvent } from 'react';

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
  voiceName,
  disabled,
}: {
  voiceName: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="setup-voice-preview-btn"
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
        // TODO: wire up voice preview playback
      }}
      aria-label={`Preview ${voiceName} voice`}
      disabled={disabled}
    >
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="setup-voice-preview-icon"
        aria-hidden="true"
      >
        <path d="M10.5 3.75a.75.75 0 0 0-1.264-.546L5.203 7H3.006a.75.75 0 0 0-.75.75v4.5c0 .414.336.75.75.75h2.197l4.033 3.796A.75.75 0 0 0 10.5 16.25V3.75Z" />
        <path d="M13.26 7.174a.75.75 0 0 1 1.06-.026 4.501 4.501 0 0 1 0 5.704.75.75 0 1 1-1.086-1.034 3.001 3.001 0 0 0 0-3.644.75.75 0 0 1 .026-1Z" />
      </svg>
    </button>
  );
}

const DURATION_OPTIONS = [
  { value: 3, label: '3 min' },
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
] as const;

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
}

function VoiceCard({
  voice,
  isSelected,
  isDisabled,
  onSelect,
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
      <SetupVoicePreviewBtn voiceName={voice.name} disabled={isDisabled} />
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
        <div className="setup-duration-group">
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onDurationChange(option.value)}
              className={`setup-duration-btn ${duration === option.value ? 'selected' : ''}`}
            >
              {option.label}
            </button>
          ))}
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
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
