import { Slider } from '@repo/ui/components/slider';
import type { RouterOutput } from '@repo/api/client';
import {
  VOICES,
  MIN_DURATION,
  MAX_DURATION,
  type UsePodcastSettingsReturn,
} from '../../hooks/use-podcast-settings';
import {
  INSTRUCTION_CHAR_LIMIT,
  INSTRUCTION_PRESETS,
  getInstructionPresetLabel,
} from '../../lib/instruction-presets';
import { PersonaPicker } from './persona-picker';
import { VoiceSelector as VoiceGrid } from '@/shared/components/voice-selector';
import {
  PERSONA_ASSIGNMENT_HELP,
  PERSONA_PODCAST_SECTION_HELP,
} from '@/shared/lib/persona-guidance';

type PodcastFull = RouterOutput['podcasts']['get'];

interface PodcastSettingsProps {
  podcast: PodcastFull;
  disabled?: boolean;
  settings: UsePodcastSettingsReturn;
  section: 'voice' | 'duration' | 'instructions';
}

export function PodcastSettings({
  podcast,
  disabled,
  settings,
  section,
}: PodcastSettingsProps) {
  const isConversation = podcast.format === 'conversation';
  const activePreset = getInstructionPresetLabel(settings.instructions);

  const handlePresetClick = (preset: (typeof INSTRUCTION_PRESETS)[number]) => {
    if (activePreset === preset.label) {
      settings.setInstructions('');
      return;
    }

    settings.setInstructions(preset.value);
  };

  const handleInstructionsChange = (value: string) => {
    const nextValue = value.slice(0, INSTRUCTION_CHAR_LIMIT);
    settings.setInstructions(nextValue);
  };

  if (section === 'voice') {
    const hostVoiceLocked = !!settings.hostPersonaVoiceId;
    const coHostVoiceLocked = !!settings.coHostPersonaVoiceId;
    const hostEffectiveVoice =
      settings.hostPersonaVoiceId || settings.hostVoice;
    const coHostEffectiveVoice =
      settings.coHostPersonaVoiceId || settings.coHostVoice;

    return (
      <div className={`mixer-section ${disabled ? 'disabled' : ''}`}>
        {/* Persona assignment */}
        <div className="space-y-4 mb-6">
          <div className="rounded-lg border border-primary/15 bg-primary/5 px-4 py-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {PERSONA_PODCAST_SECTION_HELP} {PERSONA_ASSIGNMENT_HELP}
            </p>
          </div>

          <div
            className={`grid gap-4 ${isConversation ? 'grid-cols-2' : 'grid-cols-1'}`}
          >
            <div className="space-y-2">
              <PersonaPicker
                selectedPersonaId={settings.hostPersonaId}
                onSelect={(personaId, voiceId) =>
                  settings.setHostPersona(personaId, voiceId)
                }
                disabled={disabled}
                label={isConversation ? 'Host Persona' : 'Persona'}
              />
              {hostVoiceLocked && (
                <p className="text-xs text-muted-foreground px-1">
                  Voice set to{' '}
                  <span className="font-medium text-foreground">
                    {
                      VOICES.find((v) => v.id === settings.hostPersonaVoiceId)
                        ?.name
                    }
                  </span>{' '}
                  by persona
                </p>
              )}
            </div>

            {isConversation && (
              <div className="space-y-2">
                <PersonaPicker
                  selectedPersonaId={settings.coHostPersonaId}
                  onSelect={(personaId, voiceId) =>
                    settings.setCoHostPersona(personaId, voiceId)
                  }
                  disabled={disabled}
                  label="Co-Host Persona"
                />
                {coHostVoiceLocked && (
                  <p className="text-xs text-muted-foreground px-1">
                    Voice set to{' '}
                    <span className="font-medium text-foreground">
                      {
                        VOICES.find(
                          (v) => v.id === settings.coHostPersonaVoiceId,
                        )?.name
                      }
                    </span>{' '}
                    by persona
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Voice grid — host */}
        {!hostVoiceLocked && (
          <div className="mb-6">
            {isConversation && (
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Host voice
              </h3>
            )}
            <VoiceGrid
              voice={hostEffectiveVoice}
              onChange={settings.setHostVoice}
              disabledVoice={isConversation ? coHostEffectiveVoice : undefined}
              disabled={disabled}
            />
          </div>
        )}

        {/* Voice grid — co-host */}
        {isConversation && !coHostVoiceLocked && (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Co-Host voice
            </h3>
            <VoiceGrid
              voice={coHostEffectiveVoice}
              onChange={settings.setCoHostVoice}
              disabledVoice={hostEffectiveVoice}
              disabled={disabled}
            />
          </div>
        )}

        {settings.voiceConflict && (
          <div className="mixer-voice-conflict">
            Host and co-host are using the same voice. Consider assigning
            different voices.
          </div>
        )}
      </div>
    );
  }

  if (section === 'duration') {
    return (
      <div className={`mixer-section ${disabled ? 'disabled' : ''}`}>
        <div className="mixer-duration-slider">
          <span className="mixer-duration-range-label">{MIN_DURATION}</span>
          <Slider
            value={[settings.targetDuration]}
            onValueChange={([value]) =>
              value && settings.setTargetDuration(value)
            }
            min={MIN_DURATION}
            max={MAX_DURATION}
            step={1}
            disabled={disabled}
            aria-label="Target duration in minutes"
          />
          <span className="mixer-duration-range-label">{MAX_DURATION}</span>
        </div>
        <div className="mixer-duration-readout">
          <span className="mixer-duration-readout-value">
            {settings.targetDuration}
          </span>
          <span className="mixer-duration-readout-unit">min</span>
        </div>
      </div>
    );
  }

  // section === 'instructions'
  return (
    <div className={`mixer-section ${disabled ? 'disabled' : ''}`}>
      <div className="mixer-direction">
        <p className="mixer-direction-hint">
          Guide the AI on what to change in the next script draft. You can still
          edit lines manually in the script editor.
        </p>
        <div className="mixer-direction-presets">
          {INSTRUCTION_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={`mixer-direction-preset ${activePreset === preset.label ? 'active' : ''}`}
              disabled={disabled}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <textarea
          value={settings.instructions}
          onChange={(e) => handleInstructionsChange(e.target.value)}
          disabled={disabled}
          placeholder="Tell the AI how to adjust the script\u2026"
          className="mixer-direction-textarea"
          aria-label="Script direction"
        />
        <p className="setup-char-count">
          {settings.instructions.length} / {INSTRUCTION_CHAR_LIMIT}
        </p>
      </div>
    </div>
  );
}
