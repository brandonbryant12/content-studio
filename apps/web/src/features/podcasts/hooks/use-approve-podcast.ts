// features/podcasts/hooks/use-approve-podcast.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { getPodcastQueryKey } from './use-podcast';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

type Podcast = RouterOutput['podcasts']['get'];

/**
 * Mutation to approve/revoke a podcast. Admin-only.
 * Optimistically updates `approvedBy` and `approvedAt`.
 */
export function useApprovePodcast(podcastId: string, userId: string) {
  const queryClient = useQueryClient();
  const podcastQueryKey = getPodcastQueryKey(podcastId);

  const approveMutation = useMutation(
    apiClient.podcasts.approve.mutationOptions({
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: podcastQueryKey });

        const previousPodcast =
          queryClient.getQueryData<Podcast>(podcastQueryKey);

        if (previousPodcast) {
          queryClient.setQueryData<Podcast>(podcastQueryKey, {
            ...previousPodcast,
            approvedBy: userId,
            approvedAt: new Date().toISOString(),
          });
        }

        return { previousPodcast };
      },

      onError: (error, _variables, context) => {
        if (context?.previousPodcast) {
          queryClient.setQueryData(podcastQueryKey, context.previousPodcast);
        }
        toast.error(getErrorMessage(error, 'Failed to approve podcast'));
      },

      onSuccess: () => {
        toast.success('Podcast approved');
      },
    }),
  );

  const revokeMutation = useMutation(
    apiClient.podcasts.revokeApproval.mutationOptions({
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: podcastQueryKey });

        const previousPodcast =
          queryClient.getQueryData<Podcast>(podcastQueryKey);

        if (previousPodcast) {
          queryClient.setQueryData<Podcast>(podcastQueryKey, {
            ...previousPodcast,
            approvedBy: null,
            approvedAt: null,
          });
        }

        return { previousPodcast };
      },

      onError: (error, _variables, context) => {
        if (context?.previousPodcast) {
          queryClient.setQueryData(podcastQueryKey, context.previousPodcast);
        }
        toast.error(getErrorMessage(error, 'Failed to revoke approval'));
      },

      onSuccess: () => {
        toast.success('Approval revoked');
      },
    }),
  );

  return {
    approve: approveMutation,
    revoke: revokeMutation,
  };
}
