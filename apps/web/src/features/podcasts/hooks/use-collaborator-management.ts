import { useState, useCallback } from 'react';
import { useApprovePodcast } from './use-approve-podcast';
import { useCollaboratorsQuery, type Collaborator } from './use-collaborators';
import { useRemoveCollaborator } from './use-remove-collaborator';

export interface UseCollaboratorManagementReturn {
  collaborators: readonly Collaborator[];
  isAddDialogOpen: boolean;
  openAddDialog: () => void;
  closeAddDialog: () => void;
  handleRemove: (collaboratorId: string) => void;
  isRemoving: boolean;
  handleApprove: () => void;
  handleRevoke: () => void;
  isApprovalPending: boolean;
}

export function useCollaboratorManagement(
  podcastId: string,
  currentUserId: string,
): UseCollaboratorManagementReturn {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: collaborators } = useCollaboratorsQuery(podcastId);
  const removeMutation = useRemoveCollaborator(podcastId);
  const { approve, revoke } = useApprovePodcast(podcastId, currentUserId);

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

  const handleApprove = useCallback(() => {
    approve.mutate({ id: podcastId });
  }, [approve, podcastId]);

  const handleRevoke = useCallback(() => {
    revoke.mutate({ id: podcastId });
  }, [revoke, podcastId]);

  return {
    collaborators: collaborators ?? [],
    isAddDialogOpen,
    openAddDialog,
    closeAddDialog,
    handleRemove,
    isRemoving: removeMutation.isPending,
    handleApprove,
    handleRevoke,
    isApprovalPending: approve.isPending || revoke.isPending,
  };
}
