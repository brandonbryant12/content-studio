import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';

type PodcastFull = RouterOutput['podcasts']['get'];

interface OptimisticContext {
  previousPodcast: PodcastFull | undefined;
}

/**
 * Creates optimistic mutation for podcast script generation.
 */
export function useOptimisticScriptGeneration(podcastId: string) {
  const qc = useQueryClient();
  const podcastQueryKey = apiClient.podcasts.get.queryOptions({
    input: { id: podcastId },
  }).queryKey;

  return useMutation(
    apiClient.podcasts.generateScript.mutationOptions({
      onMutate: async () => {
        await qc.cancelQueries({ queryKey: podcastQueryKey });
        const previousPodcast = qc.getQueryData<PodcastFull>(podcastQueryKey);

        if (previousPodcast) {
          qc.setQueryData<PodcastFull>(podcastQueryKey, {
            ...previousPodcast,
            status: 'generating_script',
            script: null,
            audioUrl: null,
          });
        }
        return { previousPodcast } as OptimisticContext;
      },
      onError: (_err, _vars, context) => {
        const ctx = context as OptimisticContext | undefined;
        if (ctx?.previousPodcast) {
          qc.setQueryData(podcastQueryKey, ctx.previousPodcast);
        }
        toast.error('Failed to start script generation');
      },
      onSettled: () => {
        invalidateQueries('podcasts');
      },
    }),
  );
}

/**
 * Creates optimistic mutation for podcast audio generation.
 */
export function useOptimisticAudioGeneration(podcastId: string) {
  const qc = useQueryClient();
  const podcastQueryKey = apiClient.podcasts.get.queryOptions({
    input: { id: podcastId },
  }).queryKey;

  return useMutation(
    apiClient.podcasts.generateAudio.mutationOptions({
      onMutate: async () => {
        await qc.cancelQueries({ queryKey: podcastQueryKey });
        const previousPodcast = qc.getQueryData<PodcastFull>(podcastQueryKey);

        if (previousPodcast) {
          qc.setQueryData<PodcastFull>(podcastQueryKey, {
            ...previousPodcast,
            status: 'generating_audio',
            audioUrl: null,
          });
        }
        return { previousPodcast } as OptimisticContext;
      },
      onError: (_err, _vars, context) => {
        const ctx = context as OptimisticContext | undefined;
        if (ctx?.previousPodcast) {
          qc.setQueryData(podcastQueryKey, ctx.previousPodcast);
        }
        toast.error('Failed to start audio generation');
      },
      onSettled: () => {
        invalidateQueries('podcasts');
      },
    }),
  );
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
          qc.setQueryData<PodcastFull>(podcastQueryKey, {
            ...previousPodcast,
            status: 'generating_script',
            script: null,
            audioUrl: null,
          });
        }
        return { previousPodcast } as OptimisticContext;
      },
      onError: (_err, _vars, context) => {
        const ctx = context as OptimisticContext | undefined;
        if (ctx?.previousPodcast) {
          qc.setQueryData(podcastQueryKey, ctx.previousPodcast);
        }
        toast.error('Failed to start generation');
      },
      onSettled: () => {
        invalidateQueries('podcasts');
      },
    }),
  );
}
