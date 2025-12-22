import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@repo/ui/components/button';
import { Label } from '@repo/ui/components/label';
import { Spinner } from '@repo/ui/components/spinner';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';

type PodcastFull = RouterOutput['podcasts']['get'];

// Voice options - these match the Gemini TTS voices
const VOICES = [
  { id: 'Aoede', name: 'Aoede', gender: 'female', description: 'Melodic and engaging' },
  { id: 'Kore', name: 'Kore', gender: 'female', description: 'Youthful and energetic' },
  { id: 'Leda', name: 'Leda', gender: 'female', description: 'Friendly and approachable' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'female', description: 'Light and airy' },
  { id: 'Charon', name: 'Charon', gender: 'male', description: 'Clear and professional' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'male', description: 'Bold and dynamic' },
  { id: 'Puck', name: 'Puck', gender: 'male', description: 'Lively and engaging' },
  { id: 'Orus', name: 'Orus', gender: 'male', description: 'Friendly and conversational' },
] as const;

const DURATION_OPTIONS = [
  { value: 3, label: '3 min' },
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
] as const;

interface PodcastSettingsProps {
  podcast: PodcastFull;
  disabled?: boolean;
}

export function PodcastSettings({ podcast, disabled }: PodcastSettingsProps) {
  const [hostVoice, setHostVoice] = useState(podcast.hostVoice ?? 'Aoede');
  const [coHostVoice, setCoHostVoice] = useState(podcast.coHostVoice ?? 'Charon');
  const [targetDuration, setTargetDuration] = useState(podcast.targetDurationMinutes ?? 5);
  const [instructions, setInstructions] = useState(podcast.promptInstructions ?? '');
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
    <div className="settings-section">
      {/* Save button when changes exist */}
      {hasChanges && (
        <div className="settings-section-save">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={disabled || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Spinner className="w-3 h-3 mr-1" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      )}

      {/* Voice Selection */}
      <div className="settings-group">
        <Label className="settings-label">
          {isConversation ? 'Host Voice' : 'Voice'}
        </Label>
        <div className="settings-grid">
          {VOICES.map((voice) => (
            <button
              key={voice.id}
              onClick={() => setHostVoice(voice.id)}
              disabled={disabled}
              className={`settings-option ${hostVoice === voice.id ? 'selected' : ''}`}
            >
              <div className="settings-option-content">
                <div className={`settings-voice-indicator ${voice.gender}`}>
                  {voice.gender === 'female' ? 'F' : 'M'}
                </div>
                <div className="min-w-0">
                  <p className="settings-option-name">{voice.name}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Co-Host Voice (for conversation format) */}
      {isConversation && (
        <div className="settings-group">
          <Label className="settings-label">Co-Host Voice</Label>
          <div className="settings-grid">
            {VOICES.map((voice) => (
              <button
                key={voice.id}
                onClick={() => setCoHostVoice(voice.id)}
                disabled={disabled || voice.id === hostVoice}
                className={`settings-option ${coHostVoice === voice.id ? 'selected' : ''} ${voice.id === hostVoice ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="settings-option-content">
                  <div className={`settings-voice-indicator ${voice.gender}`}>
                    {voice.gender === 'female' ? 'F' : 'M'}
                  </div>
                  <div className="min-w-0">
                    <p className="settings-option-name">{voice.name}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Target Duration */}
      <div className="settings-group">
        <Label className="settings-label">Target Length</Label>
        <div className="settings-duration-row">
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setTargetDuration(option.value)}
              disabled={disabled}
              className={`settings-duration-btn ${targetDuration === option.value ? 'selected' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Instructions */}
      <div className="settings-group">
        <Label className="settings-label">Custom Instructions</Label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          disabled={disabled}
          placeholder="Add any specific instructions for the AI when generating the script..."
          className="settings-textarea"
        />
        <p className="settings-hint">
          Examples: "Keep the tone casual and humorous" or "Focus on the key takeaways"
        </p>
      </div>
    </div>
  );
}
