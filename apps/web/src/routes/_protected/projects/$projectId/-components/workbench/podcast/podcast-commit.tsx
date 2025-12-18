import { Spinner } from '@repo/ui/components/spinner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
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
import { invalidateQueries } from '@/clients/query-helpers';

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

  const handleConfigChange = <K extends keyof PodcastConfig>(
    key: K,
    value: PodcastConfig[K],
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  // Mutations
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

  const navigateToPodcast = (podcastId: string) => {
    navigate({
      to: '/projects/$projectId/$mediaType/$mediaId',
      params: { projectId, mediaType: 'podcast', mediaId: podcastId },
      search: { docs: '' },
    });
  };

  const getCreatePayload = () => {
    const selectedVoice = voices.find((v) => v.id === config.hostVoice);
    const selectedCoHost = voices.find((v) => v.id === config.coHostVoice);

    return {
      projectId,
      format: config.format,
      documentIds: selectedDocumentIds,
      hostVoice: config.hostVoice || undefined,
      hostVoiceName: selectedVoice?.name,
      coHostVoice: config.format === 'conversation' ? config.coHostVoice || undefined : undefined,
      coHostVoiceName: config.format === 'conversation' ? selectedCoHost?.name : undefined,
      promptInstructions: config.instructions.trim() || undefined,
      targetDurationMinutes: config.targetDuration,
    };
  };

  const createAndGenerateMutation = useMutation(
    apiClient.podcasts.create.mutationOptions({
      onSuccess: async (newPodcast) => {
        generateMutation.mutate({ id: newPodcast.id });
        toast.success('Podcast created! Starting generation...');
        navigateToPodcast(newPodcast.id);
        await invalidateQueries('podcasts', 'projects');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to create podcast');
      },
    }),
  );

  const createAndPreviewMutation = useMutation(
    apiClient.podcasts.create.mutationOptions({
      onSuccess: async (newPodcast) => {
        generateScriptMutation.mutate({
          id: newPodcast.id,
          promptInstructions: config.instructions.trim() || undefined,
        });
        toast.success('Podcast created! Generating script preview...');
        navigateToPodcast(newPodcast.id);
        await invalidateQueries('podcasts', 'projects');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to create podcast');
      },
    }),
  );

  const handleGenerateFull = () => {
    if (isEditMode && podcast) {
      generateMutation.mutate({ id: podcast.id });
    } else {
      if (selectedDocumentIds.length === 0) {
        toast.error('Please select at least one document');
        return;
      }
      createAndGenerateMutation.mutate(getCreatePayload());
    }
  };

  const handlePreviewScript = () => {
    if (isEditMode && podcast) {
      generateScriptMutation.mutate({ id: podcast.id });
    } else {
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

  const loadingStates = {
    generateFull: generateMutation.isPending,
    generateScript: generateScriptMutation.isPending,
    generateAudio: generateAudioMutation.isPending,
    createAndGenerate: createAndGenerateMutation.isPending,
    createAndPreview: createAndPreviewMutation.isPending,
  };

  const isLoading = Object.values(loadingStates).some(Boolean);
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
          isLoading={isLoading}
          selectedDocumentCount={selectedDocumentIds.length}
          loadingStates={loadingStates}
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
        isLoading={isLoading}
        disabled={disabled}
        selectedDocumentCount={selectedDocumentIds.length}
        loadingStates={loadingStates}
        onGenerateFull={handleGenerateFull}
        onPreviewScript={handlePreviewScript}
        onGenerateAudio={handleGenerateAudio}
      />
    </div>
  );
}
