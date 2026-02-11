import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { getInfographicQueryKey } from './use-infographic';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

type Infographic = RouterOutput['infographics']['get'];

/**
 * Mutation to approve/revoke an infographic. Admin-only.
 * Optimistically updates `approvedBy` and `approvedAt`.
 */
export function useApproveInfographic(infographicId: string, userId: string) {
  const queryClient = useQueryClient();
  const queryKey = getInfographicQueryKey(infographicId);

  const approveMutation = useMutation(
    apiClient.infographics.approve.mutationOptions({
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey });

        const previous = queryClient.getQueryData<Infographic>(queryKey);

        if (previous) {
          queryClient.setQueryData<Infographic>(queryKey, {
            ...previous,
            approvedBy: userId,
            approvedAt: new Date().toISOString(),
          });
        }

        return { previous };
      },

      onError: (error, _variables, context) => {
        if (context?.previous) {
          queryClient.setQueryData(queryKey, context.previous);
        }
        toast.error(getErrorMessage(error, 'Failed to approve infographic'));
      },

      onSuccess: () => {
        toast.success('Infographic approved');
      },
    }),
  );

  const revokeMutation = useMutation(
    apiClient.infographics.revokeApproval.mutationOptions({
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey });

        const previous = queryClient.getQueryData<Infographic>(queryKey);

        if (previous) {
          queryClient.setQueryData<Infographic>(queryKey, {
            ...previous,
            approvedBy: null,
            approvedAt: null,
          });
        }

        return { previous };
      },

      onError: (error, _variables, context) => {
        if (context?.previous) {
          queryClient.setQueryData(queryKey, context.previous);
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
