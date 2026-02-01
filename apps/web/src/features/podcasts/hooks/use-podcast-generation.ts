import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

interface PodcastConfig {
  format: 'conversation' | 'voice_over';
  hostVoice: string;
  hostVoiceName?: string;
  coHostVoice: string;
  coHostVoiceName?: string;
  instructions: string;
  targetDuration: number;
}

interface UsePodcastGenerationOptions {
  selectedDocumentIds: string[];
  config: PodcastConfig;
}

export interface UsePodcastGenerationReturn {
  /** Generate full podcast (script + audio) for existing podcast */
  generate: (podcastId: string) => void;
  /** Create new podcast and start full generation */
  createAndGenerate: () => void;
  /** True if any mutation is pending */
  isLoading: boolean;
  /** Individual loading states */
  loadingStates: {
    generate: boolean;
    createAndGenerate: boolean;
  };
}

/**
 * Hook for managing podcast generation mutations.
 * Handles creation and generation of podcasts with proper cache invalidation.
 */
export function usePodcastGeneration({
  selectedDocumentIds,
  config,
}: UsePodcastGenerationOptions): UsePodcastGenerationReturn {
  const navigate = useNavigate();

  // Full generation mutation (script + audio)
  const generateMutation = useMutation(
    apiClient.podcasts.generate.mutationOptions({
      onSuccess: () => {
        toast.success('Generation started!');
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to start generation'));
      },
    }),
  );

  // Update podcast mutation
  const updateMutation = useMutation(
    apiClient.podcasts.update.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to update podcast'));
      },
    }),
  );

  const navigateToPodcast = (podcastId: string) => {
    navigate({
      to: '/podcasts/$podcastId',
      params: { podcastId },
      search: { version: undefined },
    });
  };

  const getCreatePayload = () => ({
    format: config.format,
    documentIds: selectedDocumentIds,
    hostVoice: config.hostVoice || undefined,
    hostVoiceName: config.hostVoiceName,
    coHostVoice:
      config.format === 'conversation'
        ? config.coHostVoice || undefined
        : undefined,
    coHostVoiceName:
      config.format === 'conversation' ? config.coHostVoiceName : undefined,
    promptInstructions: config.instructions.trim() || undefined,
    targetDurationMinutes: config.targetDuration,
  });

  // Create podcast and trigger full generation
  const createAndGenerateMutation = useMutation(
    apiClient.podcasts.create.mutationOptions({
      onSuccess: (newPodcast) => {
        generateMutation.mutate({ id: newPodcast.id });
        toast.success('Podcast created! Starting generation...');
        navigateToPodcast(newPodcast.id);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to create podcast'));
      },
    }),
  );

  const createAndGenerate = () => {
    if (selectedDocumentIds.length === 0) {
      toast.error('Please select at least one document');
      return;
    }
    createAndGenerateMutation.mutate(getCreatePayload());
  };

  const handleActionWithUpdate = async (
    podcastId: string,
    action: (id: string) => void,
  ) => {
    try {
      if (selectedDocumentIds.length > 0) {
        await updateMutation.mutateAsync({
          id: podcastId,
          documentIds: selectedDocumentIds,
        });
      }
      action(podcastId);
    } catch {
      // Toast handled by mutation
    }
  };

  const loadingStates = useMemo(
    () => ({
      generate: generateMutation.isPending,
      createAndGenerate: createAndGenerateMutation.isPending,
      update: updateMutation.isPending,
    }),
    [
      generateMutation.isPending,
      createAndGenerateMutation.isPending,
      updateMutation.isPending,
    ],
  );

  return {
    generate: (podcastId: string) =>
      handleActionWithUpdate(podcastId, (id) =>
        generateMutation.mutate({ id }),
      ),
    createAndGenerate,
    isLoading: Object.values(loadingStates).some(Boolean),
    loadingStates,
  };
}
