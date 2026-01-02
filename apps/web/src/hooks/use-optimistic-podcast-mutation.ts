import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/lib/errors';

type PodcastFull = RouterOutput['podcasts']['get'];

interface OptimisticContext {
  previousPodcast: PodcastFull | undefined;
}

/**
 * Creates optimistic mutation for full podcast generation.
 */
export function useOptimisticFullGeneration(podcastId: string) {
  const qc = useQueryClient();
  const podcastQueryKey = apiClient.podcasts.get.queryOptions({
    input: { id: podcastId },
  }).queryKey;

  return useMutation(
    apiClient.podcasts.generate.mutationOptions({
      onMutate: async () => {
        await qc.cancelQueries({ queryKey: podcastQueryKey });
        const previousPodcast = qc.getQueryData<PodcastFull>(podcastQueryKey);

        if (previousPodcast) {
          // Update activeVersion status to drafting (generating script first)
          qc.setQueryData<PodcastFull>(podcastQueryKey, {
            ...previousPodcast,
            activeVersion: previousPodcast.activeVersion
              ? {
                  ...previousPodcast.activeVersion,
                  status: 'drafting',
                  segments: null,
                  audioUrl: null,
                }
              : null,
          });
        }
        return { previousPodcast } as OptimisticContext;
      },
      onError: (err, _vars, context) => {
        const ctx = context as OptimisticContext | undefined;
        if (ctx?.previousPodcast) {
          qc.setQueryData(podcastQueryKey, ctx.previousPodcast);
        }
        toast.error(getErrorMessage(err, 'Failed to start generation'));
      },
      // No onSettled needed - SSE will trigger refetch when job completes
    }),
  );
}

/**
 * Creates optimistic mutation for saving changes and regenerating audio.
 */
export function useOptimisticSaveChanges(podcastId: string) {
  const qc = useQueryClient();
  const podcastQueryKey = apiClient.podcasts.get.queryOptions({
    input: { id: podcastId },
  }).queryKey;

  return useMutation(
    apiClient.podcasts.saveChanges.mutationOptions({
      onMutate: async () => {
        await qc.cancelQueries({ queryKey: podcastQueryKey });
        const previousPodcast = qc.getQueryData<PodcastFull>(podcastQueryKey);

        if (previousPodcast) {
          // Update activeVersion status to generating_audio
          qc.setQueryData<PodcastFull>(podcastQueryKey, {
            ...previousPodcast,
            activeVersion: previousPodcast.activeVersion
              ? {
                  ...previousPodcast.activeVersion,
                  status: 'generating_audio',
                  audioUrl: null,
                }
              : null,
          });
        }
        return { previousPodcast } as OptimisticContext;
      },
      onError: (err, _vars, context) => {
        const ctx = context as OptimisticContext | undefined;
        if (ctx?.previousPodcast) {
          qc.setQueryData(podcastQueryKey, ctx.previousPodcast);
        }
        toast.error(getErrorMessage(err, 'Failed to save changes'));
      },
      // No onSettled needed - SSE will trigger refetch when job completes
    }),
  );
}
