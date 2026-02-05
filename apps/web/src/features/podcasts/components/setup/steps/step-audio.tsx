import { PersonaSelector } from '../../selectors/persona-selector';
import { AudienceSelector } from '../../selectors/audience-selector';

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
  hostPersonaId: string | null;
  coHostPersonaId: string | null;
  audienceSegmentId: string | null;
  onDurationChange: (duration: number) => void;
  onHostVoiceChange: (voice: string) => void;
  onCoHostVoiceChange: (voice: string) => void;
  onHostPersonaChange: (id: string | null) => void;
  onCoHostPersonaChange: (id: string | null) => void;
  onAudienceSegmentChange: (id: string | null) => void;
}

export function StepAudio({
  format,
  duration,
  hostVoice,
  coHostVoice,
  hostPersonaId,
  coHostPersonaId,
  audienceSegmentId,
  onDurationChange,
  onHostVoiceChange,
  onCoHostVoiceChange,
  onHostPersonaChange,
  onCoHostPersonaChange,
  onAudienceSegmentChange,
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

      {/* Persona & Audience Selection */}
      <div className="mb-8 space-y-4">
        <label className="setup-label block text-center mb-4">
          Personas & Audience
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
          <PersonaSelector
            value={hostPersonaId}
            onChange={onHostPersonaChange}
            role="host"
            label="Host Persona"
          />
          {isConversation && (
            <PersonaSelector
              value={coHostPersonaId}
              onChange={onCoHostPersonaChange}
              role="cohost"
              label="Co-host Persona"
            />
          )}
        </div>
        <div className="max-w-lg mx-auto">
          <AudienceSelector
            value={audienceSegmentId}
            onChange={onAudienceSegmentChange}
            label="Target Audience"
          />
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
          <div className="setup-voice-grid">
            {femaleVoices.map((voice) => (
              <button
                key={voice.id}
                type="button"
                onClick={() => onHostVoiceChange(voice.id)}
                className={`setup-voice-card ${hostVoice === voice.id ? 'selected' : ''} ${
                  isConversation && coHostVoice === voice.id ? 'disabled' : ''
                }`}
                disabled={isConversation && coHostVoice === voice.id}
              >
                <div className={`setup-voice-avatar ${voice.gender}`}>
                  {voice.name.charAt(0)}
                </div>
                <p className="setup-voice-name">{voice.name}</p>
                <p className="setup-voice-desc">{voice.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Male Voices */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
            Male
          </p>
          <div className="setup-voice-grid">
            {maleVoices.map((voice) => (
              <button
                key={voice.id}
                type="button"
                onClick={() => onHostVoiceChange(voice.id)}
                className={`setup-voice-card ${hostVoice === voice.id ? 'selected' : ''} ${
                  isConversation && coHostVoice === voice.id ? 'disabled' : ''
                }`}
                disabled={isConversation && coHostVoice === voice.id}
              >
                <div className={`setup-voice-avatar ${voice.gender}`}>
                  {voice.name.charAt(0)}
                </div>
                <p className="setup-voice-name">{voice.name}</p>
                <p className="setup-voice-desc">{voice.description}</p>
              </button>
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
            <div className="setup-voice-grid">
              {femaleVoices.map((voice) => (
                <button
                  key={voice.id}
                  type="button"
                  onClick={() => onCoHostVoiceChange(voice.id)}
                  className={`setup-voice-card ${coHostVoice === voice.id ? 'selected' : ''} ${
                    hostVoice === voice.id ? 'disabled' : ''
                  }`}
                  disabled={hostVoice === voice.id}
                >
                  <div className={`setup-voice-avatar ${voice.gender}`}>
                    {voice.name.charAt(0)}
                  </div>
                  <p className="setup-voice-name">{voice.name}</p>
                  <p className="setup-voice-desc">{voice.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Male Voices */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
              Male
            </p>
            <div className="setup-voice-grid">
              {maleVoices.map((voice) => (
                <button
                  key={voice.id}
                  type="button"
                  onClick={() => onCoHostVoiceChange(voice.id)}
                  className={`setup-voice-card ${coHostVoice === voice.id ? 'selected' : ''} ${
                    hostVoice === voice.id ? 'disabled' : ''
                  }`}
                  disabled={hostVoice === voice.id}
                >
                  <div className={`setup-voice-avatar ${voice.gender}`}>
                    {voice.name.charAt(0)}
                  </div>
                  <p className="setup-voice-name">{voice.name}</p>
                  <p className="setup-voice-desc">{voice.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
