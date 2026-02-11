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
  podcastId: string;
  isOwner: boolean;
  owner: Owner;
  collaborators: Collaborator[];
}

export function CollaboratorList({
  podcastId,
  isOwner,
  owner,
  collaborators,
}: CollaboratorListProps) {
  const {
    mutate: removeCollaborator,
    isPending: isRemoving,
    variables,
  } = useRemoveCollaborator(podcastId);

  const handleRemove = useCallback(
    (collaboratorId: string) => {
      removeCollaborator({ id: podcastId, collaboratorId });
    },
    [podcastId, removeCollaborator],
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
