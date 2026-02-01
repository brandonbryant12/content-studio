// features/podcasts/hooks/use-optimistic-create.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { getPodcastListQueryKey } from './use-podcast-list';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

/**
 * Create podcast mutation with navigation on success.
 * Uses standard mutation (not optimistic) since the ID is server-generated.
 */
export function useOptimisticCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.podcasts.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getPodcastListQueryKey() });
        navigate({
          to: '/podcasts/$podcastId',
          params: { podcastId: data.id },
          search: { version: undefined },
        });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to create podcast'));
      },
    }),
  );
}
