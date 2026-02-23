import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { getSvgQueryKey } from './use-svg';
import { getSvgListQueryKey } from './use-svgs';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

export function useCreateSvg() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.svgs.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getSvgListQueryKey() });
        navigate({
          to: '/svgs/$svgId',
          params: { svgId: data.id },
        });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to create SVG'));
      },
    }),
  );
}

export function useUpdateSvg(svgId: string) {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.svgs.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getSvgQueryKey(svgId) });
        queryClient.invalidateQueries({ queryKey: getSvgListQueryKey() });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to update SVG'));
      },
    }),
  );
}

export function useDeleteSvg() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.svgs.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getSvgListQueryKey() });
        navigate({ to: '/svgs' });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to delete SVG'));
      },
    }),
  );
}
