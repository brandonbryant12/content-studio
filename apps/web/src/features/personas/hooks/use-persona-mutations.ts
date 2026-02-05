import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { useOptimisticMutation } from '@/shared/hooks';
import { getErrorMessage } from '@/shared/lib/errors';
import { getPersonaListQueryKey } from './use-personas';
import type { RouterOutput } from '@repo/api/client';

type PersonaList = RouterOutput['personas']['list'];

/**
 * Create persona mutation with cache invalidation.
 */
export function useCreatePersona(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.personas.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getPersonaListQueryKey() });
        toast.success('Persona created');
        options?.onSuccess?.();
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to create persona'));
      },
    }),
  );
}

/**
 * Update persona mutation with cache invalidation.
 */
export function useUpdatePersona(options?: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.personas.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getPersonaListQueryKey() });
        toast.success('Persona updated');
        options?.onSuccess?.();
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to update persona'));
      },
    }),
  );
}

/**
 * Delete persona from list with optimistic removal.
 */
export function useDeletePersona() {
  const deleteMutationFn =
    apiClient.personas.delete.mutationOptions().mutationFn!;

  return useOptimisticMutation<
    Record<string, never>,
    { id: string },
    PersonaList
  >({
    queryKey: getPersonaListQueryKey(),
    mutationFn: deleteMutationFn,
    getOptimisticData: (current, { id }) => {
      if (!current) return undefined;
      return current.filter((persona) => persona.id !== id);
    },
    successMessage: 'Persona deleted',
    errorMessage: 'Failed to delete persona',
    showSuccessToast: true,
  });
}
