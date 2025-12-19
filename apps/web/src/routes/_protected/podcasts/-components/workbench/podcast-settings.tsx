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
    <div className="space-y-4">
      {/* Save button when changes exist */}
      {hasChanges && (
        <div className="flex justify-end">
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
      <div className="space-y-3">
        <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          {isConversation ? 'Host Voice' : 'Voice'}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {VOICES.map((voice) => (
            <button
              key={voice.id}
              onClick={() => setHostVoice(voice.id)}
              disabled={disabled}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                hostVoice === voice.id
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                  voice.gender === 'female'
                    ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400'
                    : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                }`}>
                  {voice.gender === 'female' ? 'F' : 'M'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                    {voice.name}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Co-Host Voice (for conversation format) */}
      {isConversation && (
        <div className="space-y-3">
          <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Co-Host Voice
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {VOICES.map((voice) => (
              <button
                key={voice.id}
                onClick={() => setCoHostVoice(voice.id)}
                disabled={disabled || voice.id === hostVoice}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  coHostVoice === voice.id
                    ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/30'
                    : voice.id === hostVoice
                      ? 'border-gray-100 dark:border-gray-900 opacity-40 cursor-not-allowed'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                    voice.gender === 'female'
                      ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400'
                      : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                  }`}>
                    {voice.gender === 'female' ? 'F' : 'M'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                      {voice.name}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Target Duration */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          Target Length
        </Label>
        <div className="flex gap-2">
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setTargetDuration(option.value)}
              disabled={disabled}
              className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                targetDuration === option.value
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300'
                  : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Instructions */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          Custom Instructions
        </Label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          disabled={disabled}
          placeholder="Add any specific instructions for the AI when generating the script..."
          className="w-full h-24 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Examples: "Keep the tone casual and humorous" or "Focus on the key takeaways"
        </p>
      </div>
    </div>
  );
}
