import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { getPodcastQueryKey } from './use-podcast';
import { getPodcastListQueryKey } from './use-podcast-list';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

/**
 * Create podcast mutation with navigation on success.
 */
export function useCreatePodcast() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.podcasts.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.setQueryData(getPodcastQueryKey(data.id), data);
        toast.success('Podcast created');
        void navigate({
          to: '/podcasts/$podcastId',
          params: { podcastId: data.id },
          search: { version: undefined },
        });
        queryClient.invalidateQueries({
          queryKey: getPodcastListQueryKey(),
          refetchType: 'inactive',
        });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to create podcast'));
      },
    }),
  );
}
