import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { useOptimisticMutation } from '@/shared/hooks';
import { getErrorMessage } from '@/shared/lib/errors';
import { getAudienceSegmentListQueryKey } from './use-audience-segments';
import type { RouterOutput } from '@repo/api/client';

type AudienceSegmentList = RouterOutput['audienceSegments']['list'];

/**
 * Create audience segment mutation with cache invalidation.
 */
export function useCreateAudienceSegment(options?: {
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.audienceSegments.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getAudienceSegmentListQueryKey(),
        });
        toast.success('Audience segment created');
        options?.onSuccess?.();
      },
      onError: (error) => {
        toast.error(
          getErrorMessage(error, 'Failed to create audience segment'),
        );
      },
    }),
  );
}

/**
 * Update audience segment mutation with cache invalidation.
 */
export function useUpdateAudienceSegment(options?: {
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.audienceSegments.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getAudienceSegmentListQueryKey(),
        });
        toast.success('Audience segment updated');
        options?.onSuccess?.();
      },
      onError: (error) => {
        toast.error(
          getErrorMessage(error, 'Failed to update audience segment'),
        );
      },
    }),
  );
}

/**
 * Delete audience segment from list with optimistic removal.
 */
export function useDeleteAudienceSegment() {
  const deleteMutationFn =
    apiClient.audienceSegments.delete.mutationOptions().mutationFn!;

  return useOptimisticMutation<
    Record<string, never>,
    { id: string },
    AudienceSegmentList
  >({
    queryKey: getAudienceSegmentListQueryKey(),
    mutationFn: deleteMutationFn,
    getOptimisticData: (current, { id }) => {
      if (!current) return undefined;
      return current.filter((segment) => segment.id !== id);
    },
    successMessage: 'Audience segment deleted',
    errorMessage: 'Failed to delete audience segment',
    showSuccessToast: true,
  });
}
