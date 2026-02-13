import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { getPersonaListQueryKey } from './use-persona-list';
import { getPersonaQueryKey } from './use-persona';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

/**
 * Create persona mutation with navigation on success.
 * Uses standard mutation since the ID is server-generated.
 */
export function useCreatePersona() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.personas.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getPersonaListQueryKey() });
        navigate({
          to: '/personas/$personaId',
          params: { personaId: data.id },
        });
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
export function useUpdatePersona(personaId: string) {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.personas.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getPersonaQueryKey(personaId),
        });
        queryClient.invalidateQueries({ queryKey: getPersonaListQueryKey() });
        toast.success('Persona updated');
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to update persona'));
      },
    }),
  );
}

/**
 * Delete persona mutation with navigation on success.
 */
export function useDeletePersona() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.personas.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getPersonaListQueryKey() });
        toast.success('Persona deleted');
        navigate({ to: '/personas' });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to delete persona'));
      },
    }),
  );
}

/**
 * Generate avatar mutation with cache invalidation.
 */
export function useGenerateAvatar(personaId: string) {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.personas.generateAvatar.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getPersonaQueryKey(personaId),
        });
        toast.success('Avatar generated');
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to generate avatar'));
      },
    }),
  );
}
