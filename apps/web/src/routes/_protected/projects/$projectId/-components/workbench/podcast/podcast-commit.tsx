import {
  EyeOpenIcon,
  RocketIcon,
  PlayIcon,
  ReloadIcon,
} from '@radix-ui/react-icons';
import type { RouterOutput } from '@repo/api/client';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Label } from '@repo/ui/components/label';
import { Select } from '@repo/ui/components/select';
import { Textarea } from '@repo/ui/components/textarea';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';
import {
  type PodcastStatus,
  getStatusConfig,
} from '@/routes/_protected/podcasts/-constants/status';
import Spinner from '@/routes/-components/common/spinner';
import type { CommitProps, PodcastFull } from '../workbench-registry';

type Voice = RouterOutput['voices']['list'][number];

function VoiceSelector({
  voices,
  value,
  onChange,
  label,
  disabled,
}: {
  voices: Voice[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="">Select a voice...</option>
        {voices.map((voice) => (
          <option key={voice.id} value={voice.id}>
            {voice.name} ({voice.gender})
          </option>
        ))}
      </Select>
    </div>
  );
}

function ConfigDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: PodcastStatus }) {
  const config = getStatusConfig(status);
  return <Badge variant={config.badgeVariant}>{config.label}</Badge>;
}

export function PodcastCommit({
  projectId,
  selectedDocumentIds,
  onSuccess: _onSuccess,
  disabled,
  media,
  isEditMode,
}: CommitProps) {
  const podcast = media as PodcastFull | undefined;
  const navigate = useNavigate();

  const [format, setFormat] = useState<'conversation' | 'voice_over'>('conversation');
  const [hostVoice, setHostVoice] = useState('');
  const [coHostVoice, setCoHostVoice] = useState('');
  const [instructions, setInstructions] = useState('');
  const [targetDuration, setTargetDuration] = useState(5);

  const { data: voices = [] } = useQuery(
    apiClient.voices.list.queryOptions({ input: {} }),
  );

  // Full generation mutation (script + audio)
  const generateMutation = useMutation(
    apiClient.podcasts.generate.mutationOptions({
      onSuccess: () => {
        invalidateQueries('podcasts');
        toast.success('Generation started!');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to start generation');
      },
    }),
  );

  // Script-only generation mutation
  const generateScriptMutation = useMutation(
    apiClient.podcasts.generateScript.mutationOptions({
      onSuccess: () => {
        invalidateQueries('podcasts');
        toast.success('Script generation started!');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to start script generation');
      },
    }),
  );

  // Audio-only generation mutation
  const generateAudioMutation = useMutation(
    apiClient.podcasts.generateAudio.mutationOptions({
      onSuccess: () => {
        invalidateQueries('podcasts');
        toast.success('Audio generation started!');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to start audio generation');
      },
    }),
  );

  // Create podcast and trigger full generation
  const createAndGenerateMutation = useMutation(
    apiClient.podcasts.create.mutationOptions({
      onSuccess: async (newPodcast) => {
        generateMutation.mutate({ id: newPodcast.id });
        await invalidateQueries('podcasts', 'projects');
        toast.success('Podcast created! Starting generation...');
        // Navigate to the new podcast in the unified workbench
        navigate({
          to: '/projects/$projectId/$mediaType/$mediaId',
          params: { projectId, mediaType: 'podcast', mediaId: newPodcast.id },
          search: { docs: '' },
        });
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to create podcast');
      },
    }),
  );

  // Create podcast and trigger script-only generation
  const createAndPreviewMutation = useMutation(
    apiClient.podcasts.create.mutationOptions({
      onSuccess: async (newPodcast) => {
        generateScriptMutation.mutate({
          id: newPodcast.id,
          promptInstructions: instructions.trim() || undefined,
        });
        await invalidateQueries('podcasts', 'projects');
        toast.success('Podcast created! Generating script preview...');
        // Navigate to the new podcast in the unified workbench
        navigate({
          to: '/projects/$projectId/$mediaType/$mediaId',
          params: { projectId, mediaType: 'podcast', mediaId: newPodcast.id },
          search: { docs: '' },
        });
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to create podcast');
      },
    }),
  );

  const getCreatePayload = () => {
    const selectedVoice = voices.find((v) => v.id === hostVoice);
    const selectedCoHost = voices.find((v) => v.id === coHostVoice);

    return {
      projectId,
      format,
      documentIds: selectedDocumentIds,
      hostVoice: hostVoice || undefined,
      hostVoiceName: selectedVoice?.name,
      coHostVoice: format === 'conversation' ? coHostVoice || undefined : undefined,
      coHostVoiceName: format === 'conversation' ? selectedCoHost?.name : undefined,
      promptInstructions: instructions.trim() || undefined,
      targetDurationMinutes: targetDuration,
    };
  };

  const handleGenerateFull = () => {
    if (isEditMode && podcast) {
      // Regenerate existing podcast
      generateMutation.mutate({ id: podcast.id });
    } else {
      // Create new podcast
      if (selectedDocumentIds.length === 0) {
        toast.error('Please select at least one document');
        return;
      }
      createAndGenerateMutation.mutate(getCreatePayload());
    }
  };

  const handlePreviewScript = () => {
    if (isEditMode && podcast) {
      // Regenerate script only
      generateScriptMutation.mutate({ id: podcast.id });
    } else {
      // Create new podcast with script only
      if (selectedDocumentIds.length === 0) {
        toast.error('Please select at least one document');
        return;
      }
      createAndPreviewMutation.mutate(getCreatePayload());
    }
  };

  const handleGenerateAudio = () => {
    if (podcast) {
      generateAudioMutation.mutate({ id: podcast.id });
    }
  };

  const isConversation = isEditMode
    ? podcast?.format === 'conversation'
    : format === 'conversation';

  const isLoading =
    createAndGenerateMutation.isPending ||
    createAndPreviewMutation.isPending ||
    generateMutation.isPending ||
    generateScriptMutation.isPending ||
    generateAudioMutation.isPending;

  const isGenerating =
    podcast?.status === 'generating_script' || podcast?.status === 'generating_audio';

  // Edit mode - show configuration and status-based actions
  if (isEditMode && podcast) {
    const isScriptReady = podcast.status === 'script_ready';
    const isReady = podcast.status === 'ready';
    const isFailed = podcast.status === 'failed';
    const isDraft = podcast.status === 'draft';

    return (
      <div className="flex flex-col h-full p-6">
        <div className="flex-1 space-y-6">
          {/* Header with status */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Status
              </h3>
              <StatusBadge status={podcast.status} />
            </div>
            {isGenerating && (
              <div className="flex items-center gap-2 text-sm text-violet-600 dark:text-violet-400">
                <Spinner className="w-4 h-4" />
                {podcast.status === 'generating_script' ? 'Generating script...' : 'Generating audio...'}
              </div>
            )}
            {isFailed && podcast.errorMessage && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {podcast.errorMessage}
              </p>
            )}
          </div>

          {/* Configuration (read-only) */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Configuration
            </h3>
            <div className="space-y-1">
              <ConfigDisplay
                label="Format"
                value={podcast.format === 'conversation' ? 'Podcast' : 'Voice Over'}
              />
              <ConfigDisplay
                label={isConversation ? 'Host Voice' : 'Narrator Voice'}
                value={podcast.hostVoiceName || podcast.hostVoice || 'Default'}
              />
              {isConversation && (
                <ConfigDisplay
                  label="Co-Host Voice"
                  value={podcast.coHostVoiceName || podcast.coHostVoice || 'Default'}
                />
              )}
              <ConfigDisplay
                label="Target Duration"
                value={`${podcast.targetDurationMinutes || 5} min`}
              />
              {podcast.duration && (
                <ConfigDisplay
                  label="Actual Duration"
                  value={`${Math.floor(podcast.duration / 60)}:${(podcast.duration % 60).toString().padStart(2, '0')}`}
                />
              )}
            </div>
          </div>

          {/* Tags */}
          {podcast.tags && podcast.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Tags
              </h3>
              <div className="flex flex-wrap gap-1">
                {podcast.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons based on status */}
        <div className="pt-6 space-y-3 border-t border-gray-200 dark:border-gray-800 mt-6">
          {/* Script ready - show Generate Audio prominently */}
          {isScriptReady && (
            <>
              <Button
                onClick={handleGenerateAudio}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white"
              >
                {generateAudioMutation.isPending ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-4 h-4 mr-2" />
                    Generate Audio
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handlePreviewScript}
                disabled={isLoading}
                className="w-full"
              >
                <ReloadIcon className="w-4 h-4 mr-2" />
                Regenerate Script
              </Button>
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                Review the script in the staging area before generating audio.
              </p>
            </>
          )}

          {/* Ready - show regenerate options */}
          {isReady && (
            <>
              <Button
                variant="outline"
                onClick={handleGenerateFull}
                disabled={isLoading}
                className="w-full"
              >
                {generateMutation.isPending ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <ReloadIcon className="w-4 h-4 mr-2" />
                    Regenerate Podcast
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                This will regenerate both script and audio.
              </p>
            </>
          )}

          {/* Draft or Failed - show generate options */}
          {(isDraft || isFailed) && (
            <>
              <Button
                onClick={handleGenerateFull}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white"
              >
                {generateMutation.isPending ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RocketIcon className="w-4 h-4 mr-2" />
                    {isFailed ? 'Retry Generation' : 'Generate Podcast'}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handlePreviewScript}
                disabled={isLoading}
                className="w-full"
              >
                {generateScriptMutation.isPending ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <EyeOpenIcon className="w-4 h-4 mr-2" />
                    Preview Script First
                  </>
                )}
              </Button>
            </>
          )}

          {/* Generating - show progress */}
          {isGenerating && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Generation in progress...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Create mode - original behavior
  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Configuration
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Configure your podcast settings
          </p>
        </div>

        {/* Format toggle */}
        <div className="space-y-2">
          <Label>Format</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={format === 'conversation' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormat('conversation')}
              className="flex-1"
            >
              Podcast
            </Button>
            <Button
              type="button"
              variant={format === 'voice_over' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormat('voice_over')}
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

        {/* Voice selection */}
        <VoiceSelector
          voices={voices}
          value={hostVoice}
          onChange={setHostVoice}
          label={isConversation ? 'Host Voice' : 'Narrator Voice'}
        />

        {isConversation && (
          <VoiceSelector
            voices={voices}
            value={coHostVoice}
            onChange={setCoHostVoice}
            label="Co-Host Voice"
          />
        )}

        {/* Target duration */}
        <div className="space-y-2">
          <Label htmlFor="duration">
            Target Duration: {targetDuration} min
          </Label>
          <input
            type="range"
            id="duration"
            min={1}
            max={10}
            value={targetDuration}
            onChange={(e) => setTargetDuration(Number(e.target.value))}
            className="w-full accent-violet-500"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>1 min</span>
            <span>10 min</span>
          </div>
        </div>

        {/* Custom instructions */}
        <div className="space-y-2">
          <Label htmlFor="instructions">Instructions (optional)</Label>
          <Textarea
            id="instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Any special instructions for the AI..."
            rows={3}
            className="resize-none"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="pt-6 space-y-3 border-t border-gray-200 dark:border-gray-800 mt-6">
        {/* Document count */}
        <div className="text-center">
          {selectedDocumentIds.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select documents to continue
            </p>
          ) : (
            <p className="text-sm text-violet-600 dark:text-violet-400">
              {selectedDocumentIds.length} document
              {selectedDocumentIds.length > 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        {/* Full generation button */}
        <Button
          onClick={handleGenerateFull}
          disabled={disabled || isLoading}
          className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white"
        >
          {createAndGenerateMutation.isPending || generateMutation.isPending ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              Creating...
            </>
          ) : (
            <>
              <RocketIcon className="w-4 h-4 mr-2" />
              Generate Podcast
            </>
          )}
        </Button>

        {/* Preview Script button */}
        <Button
          variant="outline"
          onClick={handlePreviewScript}
          disabled={disabled || isLoading}
          className="w-full"
        >
          {createAndPreviewMutation.isPending || generateScriptMutation.isPending ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              Creating...
            </>
          ) : (
            <>
              <EyeOpenIcon className="w-4 h-4 mr-2" />
              Preview Script First
            </>
          )}
        </Button>

        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          Preview lets you review and edit the script before generating audio.
        </p>
      </div>
    </div>
  );
}
