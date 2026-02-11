import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { getVoiceoverListQueryKey } from './use-voiceover-list';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

/**
 * Create voiceover mutation with navigation on success.
 * Uses standard mutation (not optimistic) since the ID is server-generated.
 */
export function useOptimisticCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.voiceovers.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getVoiceoverListQueryKey() });
        navigate({
          to: '/voiceovers/$voiceoverId',
          params: { voiceoverId: data.id },
        });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to create voiceover'));
      },
    }),
  );
}
