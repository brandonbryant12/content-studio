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
import { useVoicePreview, useVoices } from '@/shared/hooks';

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
  previewUrls: Record<string, string>;
  playingVoiceId: string | null;
  onPreview: (voiceId: string) => void;
}

function VoicePreviewBtn({
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
      className={`mixer-voice-preview-btn ${isPlaying ? 'playing' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
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
          className="mixer-voice-preview-icon"
          aria-hidden="true"
        >
          <path d="M5.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75A.75.75 0 0 0 7.25 3h-1.5ZM12.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Z" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="mixer-voice-preview-icon"
          aria-hidden="true"
        >
          <path d="M10.5 3.75a.75.75 0 0 0-1.264-.546L5.203 7H3.006a.75.75 0 0 0-.75.75v4.5c0 .414.336.75.75.75h2.197l4.033 3.796A.75.75 0 0 0 10.5 16.25V3.75Z" />
          <path d="M13.26 7.174a.75.75 0 0 1 1.06-.026 4.501 4.501 0 0 1 0 5.704.75.75 0 1 1-1.086-1.034 3.001 3.001 0 0 0 0-3.644.75.75 0 0 1 .026-1Z" />
        </svg>
      )}
    </button>
  );
}

function VoiceSelector({
  value,
  onChange,
  disabledVoice,
  disabled,
  previewUrls,
  playingVoiceId,
  onPreview,
}: VoiceSelectorProps) {
  const selectedVoice = VOICES.find((v) => v.id === value);

  return (
    <div className="mixer-voice-selector-wrap">
      <SelectPrimitive.Root
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          className="mixer-voice-current"
          aria-label="Select voice"
        >
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
            style={{ minWidth: 'var(--radix-select-trigger-width)' }}
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
                    <VoicePreviewBtn
                      voiceId={voice.id}
                      voiceName={voice.name}
                      disabled={isDisabled || !previewUrls[voice.id]}
                      isPlaying={playingVoiceId === voice.id}
                      onPreview={onPreview}
                    />
                  </SelectPrimitive.Item>
                );
              })}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      <VoicePreviewBtn
        voiceId={value}
        voiceName={selectedVoice?.name ?? 'selected'}
        disabled={disabled || !previewUrls[value]}
        isPlaying={playingVoiceId === value}
        onPreview={onPreview}
      />
    </div>
  );
}

export function PodcastSettings({
  podcast,
  disabled,
  settings,
}: PodcastSettingsProps) {
  const isConversation = podcast.format === 'conversation';
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
            previewUrls={previewUrls}
            playingVoiceId={playingVoiceId}
            onPreview={handlePreview}
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
              previewUrls={previewUrls}
              playingVoiceId={playingVoiceId}
              onPreview={handlePreview}
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
            aria-label="Target duration in minutes"
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
          aria-label="Custom instructions"
        />
      </div>
    </div>
  );
}
