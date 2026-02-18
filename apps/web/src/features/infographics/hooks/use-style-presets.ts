import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

const STYLE_PRESETS_QUERY_KEY = ['infographic-style-presets'] as const;

export function useStylePresets() {
  return useQuery(apiClient.infographics.stylePresets.list.queryOptions());
}

export function useCreateStylePreset() {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.infographics.stylePresets.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: STYLE_PRESETS_QUERY_KEY,
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
          queryKey: STYLE_PRESETS_QUERY_KEY,
        });
        toast.success('Preset deleted');
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to delete preset'));
      },
    }),
  );
}
