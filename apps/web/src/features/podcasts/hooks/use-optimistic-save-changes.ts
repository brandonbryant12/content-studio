// features/podcasts/hooks/use-optimistic-save-changes.ts

import type { RouterOutput } from '@repo/api/client';
import { VersionStatus } from '@repo/db/schema';
import { apiClient } from '@/clients/apiClient';
import { useOptimisticMutation } from '@/shared/hooks/use-optimistic-mutation';
import { getPodcastQueryKey } from './use-podcast';

type Podcast = RouterOutput['podcasts']['get'];

interface Segment {
  speaker: string;
  line: string;
  index: number;
}

interface SaveChangesInput {
  id: string;
  segments?: Segment[];
  hostVoice?: string;
  hostVoiceName?: string;
  coHostVoice?: string;
  coHostVoiceName?: string;
}

// Extract mutationFn from oRPC options (always defined for mutations)
const saveChangesMutationFn =
  apiClient.podcasts.saveChanges.mutationOptions().mutationFn!;

/**
 * Optimistic mutation for saving script changes.
 * Shows 'generating_audio' status while audio regenerates.
 */
export function useOptimisticSaveChanges(podcastId: string) {
  const queryKey = getPodcastQueryKey(podcastId);

  return useOptimisticMutation<
    { jobId: string; status: string },
    SaveChangesInput,
    Podcast
  >({
    queryKey,
    mutationFn: saveChangesMutationFn,

    getOptimisticData: (current, variables) => {
      if (!current) return undefined;

      return {
        ...current,
        status: VersionStatus.GENERATING_AUDIO,
        segments: variables.segments ?? current.segments,
        audioUrl: null,
      };
    },

    successMessage: 'Regenerating audio...',
    errorMessage: 'Failed to save changes',
    showSuccessToast: true,
  });
}
