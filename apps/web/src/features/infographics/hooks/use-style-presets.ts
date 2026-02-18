import {
  type QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

const getStylePresetsQueryOptions = () =>
  apiClient.infographics.stylePresets.list.queryOptions();

export function useStylePresets() {
  return useQuery(getStylePresetsQueryOptions());
}

function getStylePresetsQueryKey(): QueryKey {
  return getStylePresetsQueryOptions().queryKey;
}

export function useCreateStylePreset() {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.infographics.stylePresets.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getStylePresetsQueryKey(),
        });
        toast.success('Preset saved');
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to save preset'));
      },
    }),
  );
}

export function useDeleteStylePreset() {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.infographics.stylePresets.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getStylePresetsQueryKey(),
        });
        toast.success('Preset deleted');
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to delete preset'));
      },
    }),
  );
}
