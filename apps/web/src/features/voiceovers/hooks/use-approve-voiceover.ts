// features/voiceovers/hooks/use-approve-voiceover.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';
import { getVoiceoverQueryKey } from './use-voiceover';
import {
  getCollaboratorsQueryKey,
  type Collaborator,
} from './use-collaborators';

type Voiceover = RouterOutput['voiceovers']['get'];

/**
 * Mutation to approve a voiceover (toggle approval status).
 * Available to both owners and collaborators.
 */
export function useApproveVoiceover(voiceoverId: string, userId: string) {
  const queryClient = useQueryClient();
  const voiceoverQueryKey = getVoiceoverQueryKey(voiceoverId);
  const collaboratorsQueryKey = getCollaboratorsQueryKey(voiceoverId);

  const approveMutation = useMutation(
    apiClient.voiceovers.approve.mutationOptions({
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: voiceoverQueryKey });
        await queryClient.cancelQueries({ queryKey: collaboratorsQueryKey });

        const previousVoiceover =
          queryClient.getQueryData<Voiceover>(voiceoverQueryKey);
        const previousCollaborators = queryClient.getQueryData<
          readonly Collaborator[]
        >(collaboratorsQueryKey);

        // Optimistically update approval status
        if (previousVoiceover) {
          // Check if user is the owner
          if (previousVoiceover.createdBy === userId) {
            queryClient.setQueryData<Voiceover>(voiceoverQueryKey, {
              ...previousVoiceover,
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

        return { previousVoiceover, previousCollaborators };
      },

      onError: (error, _variables, context) => {
        if (context?.previousVoiceover) {
          queryClient.setQueryData(
            voiceoverQueryKey,
            context.previousVoiceover,
          );
        }
        if (context?.previousCollaborators) {
          queryClient.setQueryData(
            collaboratorsQueryKey,
            context.previousCollaborators,
          );
        }
        toast.error(getErrorMessage(error, 'Failed to approve voiceover'));
      },

      onSuccess: () => {
        toast.success('Voiceover approved');
      },
    }),
  );

  const revokeMutation = useMutation(
    apiClient.voiceovers.revokeApproval.mutationOptions({
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: voiceoverQueryKey });
        await queryClient.cancelQueries({ queryKey: collaboratorsQueryKey });

        const previousVoiceover =
          queryClient.getQueryData<Voiceover>(voiceoverQueryKey);
        const previousCollaborators = queryClient.getQueryData<
          readonly Collaborator[]
        >(collaboratorsQueryKey);

        // Optimistically update approval status
        if (previousVoiceover) {
          // Check if user is the owner
          if (previousVoiceover.createdBy === userId) {
            queryClient.setQueryData<Voiceover>(voiceoverQueryKey, {
              ...previousVoiceover,
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

        return { previousVoiceover, previousCollaborators };
      },

      onError: (error, _variables, context) => {
        if (context?.previousVoiceover) {
          queryClient.setQueryData(
            voiceoverQueryKey,
            context.previousVoiceover,
          );
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
