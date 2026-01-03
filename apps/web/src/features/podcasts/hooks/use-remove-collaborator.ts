// features/podcasts/hooks/use-remove-collaborator.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';
import {
  getCollaboratorsQueryKey,
  type Collaborator,
} from './use-collaborators';

/**
 * Optimistic mutation to remove a collaborator from a podcast.
 * Only the podcast owner can remove collaborators.
 */
export function useRemoveCollaborator(podcastId: string) {
  const queryClient = useQueryClient();
  const collaboratorsQueryKey = getCollaboratorsQueryKey(podcastId);

  return useMutation(
    apiClient.podcasts.removeCollaborator.mutationOptions({
      // Optimistic update - immediately remove from list
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: collaboratorsQueryKey });

        const previous = queryClient.getQueryData<readonly Collaborator[]>(
          collaboratorsQueryKey,
        );

        if (previous) {
          queryClient.setQueryData<readonly Collaborator[]>(
            collaboratorsQueryKey,
            previous.filter((c) => c.id !== variables.collaboratorId),
          );
        }

        return { previous };
      },

      onError: (error, _variables, context) => {
        // Rollback on error
        if (context?.previous) {
          queryClient.setQueryData(collaboratorsQueryKey, context.previous);
        }
        toast.error(getErrorMessage(error, 'Failed to remove collaborator'));
      },

      onSuccess: () => {
        toast.success('Collaborator removed');
      },
    }),
  );
}
