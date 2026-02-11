import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { getVoiceoverQueryKey } from './use-voiceover';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

type Voiceover = RouterOutput['voiceovers']['get'];

/**
 * Mutation to approve/revoke a voiceover. Admin-only.
 * Optimistically updates `approvedBy` and `approvedAt`.
 */
export function useApproveVoiceover(voiceoverId: string, userId: string) {
  const queryClient = useQueryClient();
  const voiceoverQueryKey = getVoiceoverQueryKey(voiceoverId);

  const approveMutation = useMutation(
    apiClient.voiceovers.approve.mutationOptions({
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: voiceoverQueryKey });

        const previousVoiceover =
          queryClient.getQueryData<Voiceover>(voiceoverQueryKey);

        if (previousVoiceover) {
          queryClient.setQueryData<Voiceover>(voiceoverQueryKey, {
            ...previousVoiceover,
            approvedBy: userId,
            approvedAt: new Date().toISOString(),
          });
        }

        return { previousVoiceover };
      },

      onError: (error, _variables, context) => {
        if (context?.previousVoiceover) {
          queryClient.setQueryData(
            voiceoverQueryKey,
            context.previousVoiceover,
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

        const previousVoiceover =
          queryClient.getQueryData<Voiceover>(voiceoverQueryKey);

        if (previousVoiceover) {
          queryClient.setQueryData<Voiceover>(voiceoverQueryKey, {
            ...previousVoiceover,
            approvedBy: null,
            approvedAt: null,
          });
        }

        return { previousVoiceover };
      },

      onError: (error, _variables, context) => {
        if (context?.previousVoiceover) {
          queryClient.setQueryData(
            voiceoverQueryKey,
            context.previousVoiceover,
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
