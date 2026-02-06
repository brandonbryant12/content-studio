import { ChevronDownIcon, LockClosedIcon } from '@radix-ui/react-icons';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Slider } from '@repo/ui/components/slider';
import type { RouterOutput } from '@repo/api/client';
import {
  VOICES,
  MIN_DURATION,
  MAX_DURATION,
  type UsePodcastSettingsReturn,
} from '../../hooks/use-podcast-settings';

type PodcastFull = RouterOutput['podcasts']['get'];

interface PodcastSettingsProps {
  podcast: PodcastFull;
  disabled?: boolean;
  settings: UsePodcastSettingsReturn;
}

interface VoiceSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabledVoice?: string;
  disabled?: boolean;
}

function VoiceSelector({
  value,
  onChange,
  disabledVoice,
  disabled,
}: VoiceSelectorProps) {
  const selectedVoice = VOICES.find((v) => v.id === value);

  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger className="mixer-voice-current">
        <div className={`mixer-voice-avatar ${selectedVoice?.gender}`}>
          {selectedVoice?.name.charAt(0)}
        </div>
        <div className="mixer-voice-info">
          <p className="mixer-voice-name">{selectedVoice?.name}</p>
          <p className="mixer-voice-desc">{selectedVoice?.description}</p>
        </div>
        <SelectPrimitive.Icon>
          <ChevronDownIcon className="mixer-voice-chevron" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="mixer-voice-dropdown"
          position="popper"
          sideOffset={4}
        >
          <SelectPrimitive.Viewport>
            {VOICES.map((voice) => {
              const isDisabled = voice.id === disabledVoice;
              return (
                <SelectPrimitive.Item
                  key={voice.id}
                  value={voice.id}
                  disabled={isDisabled}
                  className={`mixer-voice-option ${value === voice.id ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                >
                  <div
                    className={`mixer-voice-option-avatar ${voice.gender === 'female' ? 'bg-warning/20 text-warning' : 'bg-info/20 text-info'}`}
                  >
                    {voice.name.charAt(0)}
                  </div>
                  <SelectPrimitive.ItemText>
                    <span className="mixer-voice-option-name">
                      {voice.name}
                    </span>
                  </SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              );
            })}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export function PodcastSettings({
  podcast,
  disabled,
  settings,
}: PodcastSettingsProps) {
  const isConversation = podcast.format === 'conversation';

  return (
    <div className={`mixer-section ${disabled ? 'disabled' : ''}`}>
      <div className="mixer-header">
        <h3 className="mixer-title">Voice Mixer</h3>
        {disabled && (
          <span className="mixer-locked-hint">
            <LockClosedIcon className="w-3 h-3" />
            Locked during generation
          </span>
        )}
      </div>

      <div className={`mixer-channels ${!isConversation ? 'grid-cols-1' : ''}`}>
        <div className={`mixer-channel ${!isConversation ? 'single' : ''}`}>
          <div className="mixer-channel-header">
            <div className="mixer-channel-indicator host" />
            <span className="mixer-channel-label">
              {isConversation ? 'Host' : 'Voice'}
            </span>
          </div>
          <VoiceSelector
            value={settings.hostVoice}
            onChange={settings.setHostVoice}
            disabledVoice={isConversation ? settings.coHostVoice : undefined}
            disabled={disabled}
          />
        </div>

        {isConversation && (
          <div className="mixer-channel">
            <div className="mixer-channel-header">
              <div className="mixer-channel-indicator cohost" />
              <span className="mixer-channel-label">Co-Host</span>
            </div>
            <VoiceSelector
              value={settings.coHostVoice}
              onChange={settings.setCoHostVoice}
              disabledVoice={settings.hostVoice}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      <div className="mixer-duration">
        <span className="mixer-duration-label">Target Length</span>
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
          />
          <span className="mixer-duration-range-label">{MAX_DURATION}</span>
        </div>
        <div className="mixer-duration-value-display">
          <span className="mixer-duration-value">
            {settings.targetDuration}
          </span>
          <span className="mixer-duration-unit">min</span>
        </div>
      </div>

      <div className="mixer-notes">
        <span className="mixer-notes-label">Custom Instructions</span>
        <textarea
          value={settings.instructions}
          onChange={(e) => settings.setInstructions(e.target.value)}
          disabled={disabled}
          placeholder="Add specific instructions for the AI..."
          className="mixer-notes-textarea"
        />
      </div>
    </div>
  );
}
