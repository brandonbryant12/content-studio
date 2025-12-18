import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';

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
  projectId: string;
  selectedDocumentIds: string[];
  config: PodcastConfig;
}

export interface UsePodcastGenerationReturn {
  /** Generate full podcast (script + audio) for existing podcast */
  generateFull: (podcastId: string) => void;
  /** Generate script only for existing podcast */
  generateScript: (podcastId: string) => void;
  /** Generate audio only for existing podcast with script_ready status */
  generateAudio: (podcastId: string) => void;
  /** Create new podcast and start full generation */
  createAndGenerate: () => void;
  /** Create new podcast and generate script only for preview */
  createAndPreview: () => void;
  /** True if any mutation is pending */
  isLoading: boolean;
  /** Individual loading states */
  loadingStates: {
    generateFull: boolean;
    generateScript: boolean;
    generateAudio: boolean;
    createAndGenerate: boolean;
    createAndPreview: boolean;
  };
}

/**
 * Hook for managing podcast generation mutations.
 * Handles creation and generation of podcasts with proper cache invalidation.
 */
export function usePodcastGeneration({
  projectId,
  selectedDocumentIds,
  config,
}: UsePodcastGenerationOptions): UsePodcastGenerationReturn {
  const navigate = useNavigate();

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

  const navigateToPodcast = (podcastId: string) => {
    navigate({
      to: '/projects/$projectId/$mediaType/$mediaId',
      params: { projectId, mediaType: 'podcast', mediaId: podcastId },
      search: { docs: '' },
    });
  };

  const getCreatePayload = () => ({
    projectId,
    format: config.format,
    documentIds: selectedDocumentIds,
    hostVoice: config.hostVoice || undefined,
    hostVoiceName: config.hostVoiceName,
    coHostVoice: config.format === 'conversation' ? config.coHostVoice || undefined : undefined,
    coHostVoiceName: config.format === 'conversation' ? config.coHostVoiceName : undefined,
    promptInstructions: config.instructions.trim() || undefined,
    targetDurationMinutes: config.targetDuration,
  });

  // Create podcast and trigger full generation
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

  // Create podcast and trigger script-only generation
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

  const createAndGenerate = () => {
    if (selectedDocumentIds.length === 0) {
      toast.error('Please select at least one document');
      return;
    }
    createAndGenerateMutation.mutate(getCreatePayload());
  };

  const createAndPreview = () => {
    if (selectedDocumentIds.length === 0) {
      toast.error('Please select at least one document');
      return;
    }
    createAndPreviewMutation.mutate(getCreatePayload());
  };

  const loadingStates = {
    generateFull: generateMutation.isPending,
    generateScript: generateScriptMutation.isPending,
    generateAudio: generateAudioMutation.isPending,
    createAndGenerate: createAndGenerateMutation.isPending,
    createAndPreview: createAndPreviewMutation.isPending,
  };

  return {
    generateFull: (podcastId: string) => generateMutation.mutate({ id: podcastId }),
    generateScript: (podcastId: string) => generateScriptMutation.mutate({ id: podcastId }),
    generateAudio: (podcastId: string) => generateAudioMutation.mutate({ id: podcastId }),
    createAndGenerate,
    createAndPreview,
    isLoading: Object.values(loadingStates).some(Boolean),
    loadingStates,
  };
}
