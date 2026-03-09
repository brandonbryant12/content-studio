import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { getPersonaQueryKey } from './use-persona';
import { getPersonaListQueryKey } from './use-persona-list';
import { apiClient, rawApiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

/**
 * Create persona mutation with cache invalidation and avatar generation.
 * Uses standard mutation since the ID is server-generated.
 */
export function useCreatePersona() {
  const queryClient = useQueryClient();

  return useMutation(
    apiClient.personas.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getPersonaListQueryKey() });

        rawApiClient.personas
          .generateAvatar({ id: data.id })
          .then(() => {
            queryClient.invalidateQueries({
              queryKey: getPersonaQueryKey(data.id),
            });
            toast.success('Avatar generated');
          })
          .catch(() => {
            // Avatar generation is best-effort; the detail page supports retry.
          });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to save persona'));
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
        toast.success('Persona saved');
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
