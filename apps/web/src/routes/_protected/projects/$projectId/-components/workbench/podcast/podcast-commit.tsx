import { Spinner } from '@repo/ui/components/spinner';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import type { CommitProps, PodcastFull } from '../workbench-registry';
import {
  ConfigDisplay,
  StatusBadge,
  CommitConfigForm,
  CommitActions,
  type PodcastConfig,
} from './components';
import { apiClient } from '@/clients/apiClient';
import { usePodcastGeneration } from '@/hooks';

export function PodcastCommit({
  projectId,
  selectedDocumentIds,
  onSuccess: _onSuccess,
  disabled,
  media,
  isEditMode,
}: CommitProps) {
  const podcast = media as PodcastFull | undefined;

  const [config, setConfig] = useState<PodcastConfig>({
    format: 'conversation',
    hostVoice: '',
    coHostVoice: '',
    instructions: '',
    targetDuration: 5,
  });

  const { data: voices = [] } = useQuery(
    apiClient.voices.list.queryOptions({ input: {} }),
  );

  // Compute config with voice names for the hook
  const configWithNames = useMemo(() => {
    const selectedVoice = voices.find((v) => v.id === config.hostVoice);
    const selectedCoHost = voices.find((v) => v.id === config.coHostVoice);
    return {
      ...config,
      hostVoiceName: selectedVoice?.name,
      coHostVoiceName: selectedCoHost?.name,
    };
  }, [config, voices]);

  const generation = usePodcastGeneration({
    projectId,
    selectedDocumentIds,
    config: configWithNames,
  });

  const handleConfigChange = <K extends keyof PodcastConfig>(
    key: K,
    value: PodcastConfig[K],
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerateFull = () => {
    if (isEditMode && podcast) {
      generation.generateFull(podcast.id);
    } else {
      generation.createAndGenerate();
    }
  };

  const handlePreviewScript = () => {
    if (isEditMode && podcast) {
      generation.generateScript(podcast.id);
    } else {
      generation.createAndPreview();
    }
  };

  const handleGenerateAudio = () => {
    if (podcast) {
      generation.generateAudio(podcast.id);
    } else {
      toast.error('No podcast to generate audio for');
    }
  };

  const isGenerating =
    podcast?.status === 'generating_script' || podcast?.status === 'generating_audio';
  const isConversation = isEditMode
    ? podcast?.format === 'conversation'
    : config.format === 'conversation';

  // Edit mode - show configuration and status-based actions
  if (isEditMode && podcast) {
    return (
      <div className="flex flex-col h-full p-6">
        <div className="flex-1 space-y-6">
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
            {podcast.status === 'failed' && podcast.errorMessage && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {podcast.errorMessage}
              </p>
            )}
          </div>

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

        <CommitActions
          status={podcast.status}
          isEditMode
          isLoading={generation.isLoading}
          selectedDocumentCount={selectedDocumentIds.length}
          loadingStates={generation.loadingStates}
          onGenerateFull={handleGenerateFull}
          onPreviewScript={handlePreviewScript}
          onGenerateAudio={handleGenerateAudio}
        />
      </div>
    );
  }

  // Create mode
  return (
    <div className="flex flex-col h-full p-6">
      <CommitConfigForm
        config={config}
        voices={voices}
        onConfigChange={handleConfigChange}
      />

      <CommitActions
        isEditMode={false}
        isLoading={generation.isLoading}
        disabled={disabled}
        selectedDocumentCount={selectedDocumentIds.length}
        loadingStates={generation.loadingStates}
        onGenerateFull={handleGenerateFull}
        onPreviewScript={handlePreviewScript}
        onGenerateAudio={handleGenerateAudio}
      />
    </div>
  );
}
