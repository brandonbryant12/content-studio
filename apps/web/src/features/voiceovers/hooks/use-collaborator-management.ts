// features/voiceovers/hooks/use-collaborator-management.ts

import { useState, useCallback, useMemo } from 'react';
import { useCollaborators, type Collaborator } from './use-collaborators';
import { useApproveVoiceover } from './use-approve-voiceover';
import type { RouterOutput } from '@repo/api/client';

type Voiceover = RouterOutput['voiceovers']['get'];

interface Owner {
  id: string;
  name: string;
  image?: string | null;
  hasApproved: boolean;
}

export interface UseCollaboratorManagementReturn {
  collaborators: readonly Collaborator[];
  owner: Owner;
  isAddDialogOpen: boolean;
  openAddDialog: () => void;
  closeAddDialog: () => void;
  currentUserHasApproved: boolean;
  handleApprove: () => void;
  handleRevoke: () => void;
  isApprovalPending: boolean;
}

export function useCollaboratorManagement(
  voiceover: Voiceover,
  currentUserId: string,
  currentUser?: { id?: string; name?: string | null; image?: string | null } | null,
): UseCollaboratorManagementReturn {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: collaborators } = useCollaborators(voiceover.id);
  const { approve, revoke } = useApproveVoiceover(voiceover.id, currentUserId);

  const openAddDialog = useCallback(() => {
    setIsAddDialogOpen(true);
  }, []);

  const closeAddDialog = useCallback(() => {
    setIsAddDialogOpen(false);
  }, []);

  // Owner info for collaborator display
  const owner = useMemo(
    () => ({
      id: voiceover.createdBy,
      name:
        currentUser?.id === voiceover.createdBy
          ? (currentUser?.name ?? 'You')
          : 'Owner',
      image:
        currentUser?.id === voiceover.createdBy ? currentUser?.image : undefined,
      hasApproved: voiceover.ownerHasApproved,
    }),
    [
      voiceover.createdBy,
      voiceover.ownerHasApproved,
      currentUser?.id,
      currentUser?.name,
      currentUser?.image,
    ],
  );

  // Check if current user has approved
  const currentUserHasApproved = useMemo(() => {
    if (currentUserId === voiceover.createdBy) {
      return voiceover.ownerHasApproved;
    }
    const userCollaborator = collaborators.find(
      (c) => c.userId === currentUserId,
    );
    return userCollaborator?.hasApproved ?? false;
  }, [
    currentUserId,
    voiceover.createdBy,
    voiceover.ownerHasApproved,
    collaborators,
  ]);

  const handleApprove = useCallback(() => {
    approve.mutate({ id: voiceover.id });
  }, [approve, voiceover.id]);

  const handleRevoke = useCallback(() => {
    revoke.mutate({ id: voiceover.id });
  }, [revoke, voiceover.id]);

  const isApprovalPending = approve.isPending || revoke.isPending;

  return {
    collaborators,
    owner,
    isAddDialogOpen,
    openAddDialog,
    closeAddDialog,
    currentUserHasApproved,
    handleApprove,
    handleRevoke,
    isApprovalPending,
  };
}
