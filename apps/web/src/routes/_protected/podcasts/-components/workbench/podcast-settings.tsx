import { ChevronDownIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Slider } from '@repo/ui/components/slider';
import { Spinner } from '@repo/ui/components/spinner';
import { useMutation } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';
import { ConfirmationDialog } from '@/components/confirmation-dialog';

type PodcastFull = RouterOutput['podcasts']['get'];

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

const MIN_DURATION = 1;
const MAX_DURATION = 10;

interface PodcastSettingsProps {
  podcast: PodcastFull;
  disabled?: boolean;
  onRegenerate: () => void;
  isRegenerating: boolean;
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
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedVoice = VOICES.find((v) => v.id === value);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="mixer-voice-selector" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`mixer-voice-current ${isOpen ? 'open' : ''}`}
      >
        <div className={`mixer-voice-avatar ${selectedVoice?.gender}`}>
          {selectedVoice?.name.charAt(0)}
        </div>
        <div className="mixer-voice-info">
          <p className="mixer-voice-name">{selectedVoice?.name}</p>
          <p className="mixer-voice-desc">{selectedVoice?.description}</p>
        </div>
        <ChevronDownIcon className="mixer-voice-chevron" />
      </button>

      {isOpen && (
        <div className="mixer-voice-dropdown">
          {VOICES.map((voice) => {
            const isDisabled = voice.id === disabledVoice;
            return (
              <button
                key={voice.id}
                type="button"
                onClick={() => {
                  if (!isDisabled) {
                    onChange(voice.id);
                    setIsOpen(false);
                  }
                }}
                className={`mixer-voice-option ${value === voice.id ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
              >
                <div
                  className={`mixer-voice-option-avatar ${voice.gender === 'female' ? 'bg-warning/20 text-warning' : 'bg-info/20 text-info'}`}
                >
                  {voice.name.charAt(0)}
                </div>
                <span className="mixer-voice-option-name">{voice.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PodcastSettings({
  podcast,
  disabled,
  onRegenerate,
  isRegenerating,
}: PodcastSettingsProps) {
  const [hostVoice, setHostVoice] = useState(podcast.hostVoice ?? 'Aoede');
  const [coHostVoice, setCoHostVoice] = useState(
    podcast.coHostVoice ?? 'Charon',
  );
  const [targetDuration, setTargetDuration] = useState(
    podcast.targetDurationMinutes ?? 5,
  );
  const [instructions, setInstructions] = useState(
    podcast.promptInstructions ?? '',
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Track changes
  useEffect(() => {
    const changed =
      hostVoice !== (podcast.hostVoice ?? 'Aoede') ||
      coHostVoice !== (podcast.coHostVoice ?? 'Charon') ||
      targetDuration !== (podcast.targetDurationMinutes ?? 5) ||
      instructions !== (podcast.promptInstructions ?? '');
    setHasChanges(changed);
  }, [hostVoice, coHostVoice, targetDuration, instructions, podcast]);

  // Reset when podcast changes
  useEffect(() => {
    setHostVoice(podcast.hostVoice ?? 'Aoede');
    setCoHostVoice(podcast.coHostVoice ?? 'Charon');
    setTargetDuration(podcast.targetDurationMinutes ?? 5);
    setInstructions(podcast.promptInstructions ?? '');
  }, [podcast.id]);

  const updateMutation = useMutation(
    apiClient.podcasts.update.mutationOptions({
      onError: (error) => {
        toast.error(error.message ?? 'Failed to save settings');
      },
    }),
  );

  const handleSave = () => {
    // If podcast has existing audio, show confirmation before regenerating
    if (podcast.audioUrl) {
      setShowConfirmation(true);
      return;
    }
    // Otherwise, save and regenerate directly
    saveAndTriggerRegeneration();
  };

  const saveAndTriggerRegeneration = async () => {
    setShowConfirmation(false);

    const hostVoiceInfo = VOICES.find((v) => v.id === hostVoice);
    const coHostVoiceInfo = VOICES.find((v) => v.id === coHostVoice);

    try {
      await updateMutation.mutateAsync({
        id: podcast.id,
        hostVoice,
        hostVoiceName: hostVoiceInfo?.name,
        coHostVoice,
        coHostVoiceName: coHostVoiceInfo?.name,
        targetDurationMinutes: targetDuration,
        promptInstructions: instructions || undefined,
      });

      // Settings saved, now trigger regeneration
      onRegenerate();
    } catch {
      // Error already handled by mutation onError
    }
  };

  const isConversation = podcast.format === 'conversation';

  return (
    <div className="mixer-section">
      {/* Header with Save */}
      <div className="mixer-header">
        <h3 className="mixer-title">Voice Mixer</h3>
        {hasChanges && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            disabled={disabled || updateMutation.isPending || isRegenerating}
            className="mixer-save-btn"
          >
            {updateMutation.isPending || isRegenerating ? (
              <>
                <Spinner className="w-3 h-3 mr-1" />
                {updateMutation.isPending ? 'Saving' : 'Generating'}
              </>
            ) : (
              'Save & Regenerate'
            )}
          </Button>
        )}
      </div>

      {/* Channel Strips */}
      <div className={`mixer-channels ${!isConversation ? 'grid-cols-1' : ''}`}>
        {/* Host Channel */}
        <div className={`mixer-channel ${!isConversation ? 'single' : ''}`}>
          <div className="mixer-channel-header">
            <div className="mixer-channel-indicator host" />
            <span className="mixer-channel-label">
              {isConversation ? 'Host' : 'Voice'}
            </span>
          </div>
          <VoiceSelector
            value={hostVoice}
            onChange={setHostVoice}
            disabledVoice={isConversation ? coHostVoice : undefined}
            disabled={disabled}
          />
        </div>

        {/* Co-Host Channel */}
        {isConversation && (
          <div className="mixer-channel">
            <div className="mixer-channel-header">
              <div className="mixer-channel-indicator cohost" />
              <span className="mixer-channel-label">Co-Host</span>
            </div>
            <VoiceSelector
              value={coHostVoice}
              onChange={setCoHostVoice}
              disabledVoice={hostVoice}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Duration Control */}
      <div className="mixer-duration">
        <span className="mixer-duration-label">Target Length</span>
        <div className="mixer-duration-slider">
          <span className="mixer-duration-range-label">{MIN_DURATION}</span>
          <Slider
            value={[targetDuration]}
            onValueChange={([value]) => value && setTargetDuration(value)}
            min={MIN_DURATION}
            max={MAX_DURATION}
            step={1}
            disabled={disabled}
          />
          <span className="mixer-duration-range-label">{MAX_DURATION}</span>
        </div>
        <div className="mixer-duration-value-display">
          <span className="mixer-duration-value">{targetDuration}</span>
          <span className="mixer-duration-unit">min</span>
        </div>
      </div>

      {/* Custom Instructions */}
      <div className="mixer-notes">
        <span className="mixer-notes-label">Custom Instructions</span>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          disabled={disabled}
          placeholder="Add specific instructions for the AI..."
          className="mixer-notes-textarea"
        />
      </div>

      {/* Confirmation Dialog for Regeneration */}
      <ConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        title="Regenerate Podcast?"
        description="This will replace your existing script and audio with newly generated content. This action cannot be undone."
        confirmText="Regenerate"
        variant="warning"
        isLoading={updateMutation.isPending || isRegenerating}
        onConfirm={saveAndTriggerRegeneration}
      />
    </div>
  );
}
