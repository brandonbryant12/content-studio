import { Button } from '@repo/ui/components/button';
import { Label } from '@repo/ui/components/label';
import { Textarea } from '@repo/ui/components/textarea';
import type { RouterOutput } from '@repo/api/client';
import { VoiceSelector } from '@/routes/_protected/projects/-components/podcast/voice-selector';

type Voice = RouterOutput['voices']['list'][number];

export interface PodcastConfig {
  format: 'conversation' | 'voice_over';
  hostVoice: string;
  coHostVoice: string;
  instructions: string;
  targetDuration: number;
}

interface CommitConfigFormProps {
  config: PodcastConfig;
  voices: Voice[];
  onConfigChange: <K extends keyof PodcastConfig>(key: K, value: PodcastConfig[K]) => void;
}

export function CommitConfigForm({
  config,
  voices,
  onConfigChange,
}: CommitConfigFormProps) {
  const isConversation = config.format === 'conversation';

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Configuration
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Configure your podcast settings
        </p>
      </div>

      <div className="space-y-2">
        <Label>Format</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={config.format === 'conversation' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onConfigChange('format', 'conversation')}
            className="flex-1"
          >
            Podcast
          </Button>
          <Button
            type="button"
            variant={config.format === 'voice_over' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onConfigChange('format', 'voice_over')}
            className="flex-1"
          >
            Voice Over
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {isConversation
            ? 'Two hosts discuss the content'
            : 'Single narrator reads the content'}
        </p>
      </div>

      <VoiceSelector
        voices={voices}
        value={config.hostVoice}
        onChange={(value) => onConfigChange('hostVoice', value)}
        label={isConversation ? 'Host Voice' : 'Narrator Voice'}
      />

      {isConversation && (
        <VoiceSelector
          voices={voices}
          value={config.coHostVoice}
          onChange={(value) => onConfigChange('coHostVoice', value)}
          label="Co-Host Voice"
        />
      )}

      <div className="space-y-2">
        <Label htmlFor="duration">
          Target Duration: {config.targetDuration} min
        </Label>
        <input
          type="range"
          id="duration"
          min={1}
          max={10}
          value={config.targetDuration}
          onChange={(e) => onConfigChange('targetDuration', Number(e.target.value))}
          className="w-full accent-violet-500"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>1 min</span>
          <span>10 min</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Instructions (optional)</Label>
        <Textarea
          id="instructions"
          value={config.instructions}
          onChange={(e) => onConfigChange('instructions', e.target.value)}
          placeholder="Any special instructions for the AI..."
          rows={3}
          className="resize-none"
        />
      </div>
    </div>
  );
}
