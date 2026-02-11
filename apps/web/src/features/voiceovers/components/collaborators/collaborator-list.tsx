import { useCallback } from 'react';
import type { Collaborator } from '../../hooks/use-collaborators';
import { useRemoveCollaborator } from '../../hooks/use-remove-collaborator';
import { CollaboratorList as SharedList } from '@/shared/components/collaborators';

interface Owner {
  id: string;
  name: string;
  image?: string | null;
}

export interface CollaboratorListProps {
  voiceoverId: string;
  isOwner: boolean;
  owner: Owner;
  collaborators: Collaborator[];
}

export function CollaboratorList({
  voiceoverId,
  isOwner,
  owner,
  collaborators,
}: CollaboratorListProps) {
  const {
    mutate: removeCollaborator,
    isPending: isRemoving,
    variables,
  } = useRemoveCollaborator(voiceoverId);

  const handleRemove = useCallback(
    (collaboratorId: string) => {
      removeCollaborator({ id: voiceoverId, collaboratorId });
    },
    [removeCollaborator, voiceoverId],
  );

  return (
    <SharedList
      isOwner={isOwner}
      owner={owner}
      collaborators={collaborators}
      removingCollaboratorId={
        isRemoving ? variables?.collaboratorId : undefined
      }
      onRemove={handleRemove}
    />
  );
}
