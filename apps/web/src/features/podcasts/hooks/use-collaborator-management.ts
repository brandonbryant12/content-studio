// features/podcasts/hooks/use-collaborator-management.ts

import { useState, useCallback } from 'react';
import {
  useCollaboratorsQuery,
  type Collaborator,
} from './use-collaborators';
import { useRemoveCollaborator } from './use-remove-collaborator';

export interface UseCollaboratorManagementReturn {
  collaborators: readonly Collaborator[];
  isAddDialogOpen: boolean;
  openAddDialog: () => void;
  closeAddDialog: () => void;
  handleRemove: (collaboratorId: string) => void;
  isRemoving: boolean;
}

export function useCollaboratorManagement(
  podcastId: string,
): UseCollaboratorManagementReturn {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: collaborators } = useCollaboratorsQuery(podcastId);
  const removeMutation = useRemoveCollaborator(podcastId);

  const openAddDialog = useCallback(() => {
    setIsAddDialogOpen(true);
  }, []);

  const closeAddDialog = useCallback(() => {
    setIsAddDialogOpen(false);
  }, []);

  const handleRemove = useCallback(
    (collaboratorId: string) => {
      removeMutation.mutate({ id: podcastId, collaboratorId });
    },
    [removeMutation, podcastId],
  );

  return {
    collaborators: collaborators ?? [],
    isAddDialogOpen,
    openAddDialog,
    closeAddDialog,
    handleRemove,
    isRemoving: removeMutation.isPending,
  };
}
