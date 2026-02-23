import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { getSlideDeckQueryKey } from './use-slide-deck';
import { getSlideDeckVersionsQueryKey } from './use-slide-deck-versions';
import { getSlideDeckListQueryKey } from './use-slide-decks';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

export function useCreateSlideDeck() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.slideDecks.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: getSlideDeckListQueryKey(),
        });
        navigate({
          to: '/slides/$slideDeckId',
          params: { slideDeckId: data.id },
        });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to create slide deck'));
      },
    }),
  );
}

export function useUpdateSlideDeck(slideDeckId: string) {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.slideDecks.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getSlideDeckQueryKey(slideDeckId),
        });
        queryClient.invalidateQueries({
          queryKey: getSlideDeckListQueryKey(),
        });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to update slide deck'));
      },
    }),
  );
}

export function useDeleteSlideDeck() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.slideDecks.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getSlideDeckListQueryKey(),
        });
        navigate({ to: '/slides' });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to delete slide deck'));
      },
    }),
  );
}

export function useGenerateSlideDeck(slideDeckId: string) {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.slideDecks.generate.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getSlideDeckQueryKey(slideDeckId),
        });
        queryClient.invalidateQueries({
          queryKey: getSlideDeckVersionsQueryKey(slideDeckId),
        });
        toast.success('Slide generation started');
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to start slide generation'));
      },
    }),
  );
}
