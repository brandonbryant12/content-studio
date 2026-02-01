// features/voiceovers/hooks/use-add-collaborator.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getCollaboratorsQueryKey } from './use-collaborators';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

/**
 * Mutation to add a collaborator to a voiceover.
 * Only the voiceover owner can add collaborators.
 */
export function useAddCollaborator(voiceoverId: string) {
  const queryClient = useQueryClient();
  const collaboratorsQueryKey = getCollaboratorsQueryKey(voiceoverId);

  return useMutation(
    apiClient.voiceovers.addCollaborator.mutationOptions({
      onSuccess: (data) => {
        // Invalidate collaborators list to refetch
        queryClient.invalidateQueries({ queryKey: collaboratorsQueryKey });

        const name = data.userName || data.email;
        toast.success(`Added ${name} as a collaborator`);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to add collaborator'));
      },
    }),
  );
}
