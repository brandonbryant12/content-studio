// features/podcasts/hooks/use-approve-podcast.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import {
  getCollaboratorsQueryKey,
  type Collaborator,
} from './use-collaborators';
import { getPodcastQueryKey } from './use-podcast';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

type Podcast = RouterOutput['podcasts']['get'];

/**
 * Mutation to approve a podcast (toggle approval status).
 * Available to both owners and collaborators.
 */
export function useApprovePodcast(podcastId: string, userId: string) {
  const queryClient = useQueryClient();
  const podcastQueryKey = getPodcastQueryKey(podcastId);
  const collaboratorsQueryKey = getCollaboratorsQueryKey(podcastId);

  const approveMutation = useMutation(
    apiClient.podcasts.approve.mutationOptions({
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: podcastQueryKey });
        await queryClient.cancelQueries({ queryKey: collaboratorsQueryKey });

        const previousPodcast =
          queryClient.getQueryData<Podcast>(podcastQueryKey);
        const previousCollaborators = queryClient.getQueryData<
          readonly Collaborator[]
        >(collaboratorsQueryKey);

        // Optimistically update approval status
        if (previousPodcast) {
          // Check if user is the owner
          if (previousPodcast.createdBy === userId) {
            queryClient.setQueryData<Podcast>(podcastQueryKey, {
              ...previousPodcast,
              ownerHasApproved: true,
            });
          }
        }

        // Update collaborator approval status if user is a collaborator
        if (previousCollaborators) {
          queryClient.setQueryData<readonly Collaborator[]>(
            collaboratorsQueryKey,
            previousCollaborators.map((c) =>
              c.userId === userId
                ? {
                    ...c,
                    hasApproved: true,
                    approvedAt: new Date().toISOString(),
                  }
                : c,
            ),
          );
        }

        return { previousPodcast, previousCollaborators };
      },

      onError: (error, _variables, context) => {
        if (context?.previousPodcast) {
          queryClient.setQueryData(podcastQueryKey, context.previousPodcast);
        }
        if (context?.previousCollaborators) {
          queryClient.setQueryData(
            collaboratorsQueryKey,
            context.previousCollaborators,
          );
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
        await queryClient.cancelQueries({ queryKey: collaboratorsQueryKey });

        const previousPodcast =
          queryClient.getQueryData<Podcast>(podcastQueryKey);
        const previousCollaborators = queryClient.getQueryData<
          readonly Collaborator[]
        >(collaboratorsQueryKey);

        // Optimistically update approval status
        if (previousPodcast) {
          // Check if user is the owner
          if (previousPodcast.createdBy === userId) {
            queryClient.setQueryData<Podcast>(podcastQueryKey, {
              ...previousPodcast,
              ownerHasApproved: false,
            });
          }
        }

        // Update collaborator approval status if user is a collaborator
        if (previousCollaborators) {
          queryClient.setQueryData<readonly Collaborator[]>(
            collaboratorsQueryKey,
            previousCollaborators.map((c) =>
              c.userId === userId
                ? { ...c, hasApproved: false, approvedAt: null }
                : c,
            ),
          );
        }

        return { previousPodcast, previousCollaborators };
      },

      onError: (error, _variables, context) => {
        if (context?.previousPodcast) {
          queryClient.setQueryData(podcastQueryKey, context.previousPodcast);
        }
        if (context?.previousCollaborators) {
          queryClient.setQueryData(
            collaboratorsQueryKey,
            context.previousCollaborators,
          );
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
