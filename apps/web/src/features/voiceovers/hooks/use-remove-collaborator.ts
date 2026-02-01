// features/voiceovers/hooks/use-remove-collaborator.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getCollaboratorsQueryKey,
  type Collaborator,
} from './use-collaborators';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

/**
 * Optimistic mutation to remove a collaborator from a voiceover.
 * Only the voiceover owner can remove collaborators.
 */
export function useRemoveCollaborator(voiceoverId: string) {
  const queryClient = useQueryClient();
  const collaboratorsQueryKey = getCollaboratorsQueryKey(voiceoverId);

  return useMutation(
    apiClient.voiceovers.removeCollaborator.mutationOptions({
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
