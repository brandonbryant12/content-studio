import { ChevronDownIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { useMutation } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';

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

const DURATION_OPTIONS = [
  { value: 3, label: '3m' },
  { value: 5, label: '5m' },
  { value: 10, label: '10m' },
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
] as const;

interface PodcastSettingsProps {
  podcast: PodcastFull;
  disabled?: boolean;
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

export function PodcastSettings({ podcast, disabled }: PodcastSettingsProps) {
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
  const [showNotes, setShowNotes] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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
      onSuccess: async () => {
        toast.success('Settings saved');
        await invalidateQueries('podcasts');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to save settings');
      },
    }),
  );

  const handleSave = () => {
    const hostVoiceInfo = VOICES.find((v) => v.id === hostVoice);
    const coHostVoiceInfo = VOICES.find((v) => v.id === coHostVoice);

    updateMutation.mutate({
      id: podcast.id,
      hostVoice,
      hostVoiceName: hostVoiceInfo?.name,
      coHostVoice,
      coHostVoiceName: coHostVoiceInfo?.name,
      targetDurationMinutes: targetDuration,
      promptInstructions: instructions || undefined,
    });
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
            disabled={disabled || updateMutation.isPending}
            className="mixer-save-btn"
          >
            {updateMutation.isPending ? (
              <>
                <Spinner className="w-3 h-3 mr-1" />
                Saving
              </>
            ) : (
              'Save'
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
        <div className="mixer-duration-track">
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTargetDuration(option.value)}
              disabled={disabled}
              className={`mixer-duration-option ${targetDuration === option.value ? 'selected' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Instructions */}
      <div className="mixer-notes">
        <button
          type="button"
          onClick={() => setShowNotes(!showNotes)}
          className={`mixer-notes-toggle ${showNotes ? 'open' : ''}`}
        >
          <span>Custom Instructions</span>
          <ChevronDownIcon />
        </button>
        {showNotes && (
          <div className="mixer-notes-content">
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={disabled}
              placeholder="Add specific instructions for the AI..."
              className="mixer-notes-textarea"
            />
          </div>
        )}
      </div>
    </div>
  );
}
