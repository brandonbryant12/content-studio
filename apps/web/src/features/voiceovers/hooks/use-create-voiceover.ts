import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { getVoiceoverQueryKey } from './use-voiceover';
import { getVoiceoverListQueryKey } from './use-voiceover-list';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

/**
 * Create voiceover mutation with navigation on success.
 * Uses standard mutation (not optimistic) since the ID is server-generated.
 */
export function useCreateVoiceover() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.voiceovers.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.setQueryData(getVoiceoverQueryKey(data.id), data);
        toast.success('Voiceover created');
        void navigate({
          to: '/voiceovers/$voiceoverId',
          params: { voiceoverId: data.id },
        });
        queryClient.invalidateQueries({
          queryKey: getVoiceoverListQueryKey(),
          refetchType: 'inactive',
        });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to create voiceover'));
      },
    }),
  );
}
