// features/voiceovers/hooks/use-collaborator-management.ts

import { useState, useCallback, useMemo } from 'react';
import type { RouterOutput } from '@repo/api/client';
import { useApproveVoiceover } from './use-approve-voiceover';
import { useCollaborators, type Collaborator } from './use-collaborators';

type Voiceover = RouterOutput['voiceovers']['get'];

interface Owner {
  id: string;
  name: string;
  image?: string | null;
}

export interface UseCollaboratorManagementReturn {
  collaborators: readonly Collaborator[];
  owner: Owner;
  isAddDialogOpen: boolean;
  openAddDialog: () => void;
  closeAddDialog: () => void;
  isApproved: boolean;
  isAdmin: boolean;
  handleApprove: () => void;
  handleRevoke: () => void;
  isApprovalPending: boolean;
}

export function useCollaboratorManagement(
  voiceover: Voiceover,
  currentUserId: string,
  currentUser?: {
    id?: string;
    name?: string | null;
    image?: string | null;
    role?: string;
  } | null,
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
        currentUser?.id === voiceover.createdBy
          ? currentUser?.image
          : undefined,
    }),
    [
      voiceover.createdBy,
      currentUser?.id,
      currentUser?.name,
      currentUser?.image,
    ],
  );

  const isApproved = voiceover.approvedBy !== null;
  const isAdmin = currentUser?.role === 'admin';

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
    isApproved,
    isAdmin,
    handleApprove,
    handleRevoke,
    isApprovalPending,
  };
}
