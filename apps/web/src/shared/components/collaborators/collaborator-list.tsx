import { Cross2Icon, PersonIcon } from '@radix-ui/react-icons';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@repo/ui/components/avatar';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { memo, useCallback } from 'react';
import { getInitials } from '@/shared/lib/get-initials';

interface Owner {
  id: string;
  name: string;
  image?: string | null;
}

export interface CollaboratorData {
  id: string;
  userId: string | null;
  email: string;
  userName: string | null;
  userImage: string | null;
}

export interface CollaboratorListProps {
  isOwner: boolean;
  owner: Owner;
  collaborators: readonly CollaboratorData[];
  removingCollaboratorId?: string;
  onRemove?: (collaboratorId: string) => void;
}

interface CollaboratorRowProps {
  collaboratorId?: string;
  name: string | null;
  email: string;
  image: string | null | undefined;
  isPending: boolean;
  isOwner: boolean;
  canRemove: boolean;
  isRemoving: boolean;
  onRemove?: (collaboratorId: string) => void;
}

const CollaboratorRow = memo(function CollaboratorRow({
  collaboratorId,
  name,
  email,
  image,
  isPending,
  isOwner,
  canRemove,
  isRemoving,
  onRemove,
}: CollaboratorRowProps) {
  const displayName = name || email;
  const initials = getInitials(name, email);

  const handleClick = useCallback(() => {
    if (collaboratorId && onRemove) {
      onRemove(collaboratorId);
    }
  }, [collaboratorId, onRemove]);

  return (
    <div className="collab-list-row">
      <div className="collab-list-avatar-wrapper">
        <Avatar
          className={`collab-list-avatar ${isPending ? 'collab-avatar-pending' : ''}`}
        >
          {image ? <AvatarImage src={image} alt={displayName} /> : null}
          <AvatarFallback
            className={`collab-avatar-fallback ${isPending ? 'collab-fallback-pending' : ''}`}
          >
            {isPending ? (
              <PersonIcon className="w-4 h-4 text-muted-foreground" />
            ) : (
              initials
            )}
          </AvatarFallback>
        </Avatar>

        {isOwner && (
          <span className="collab-list-owner-badge">
            <svg
              viewBox="0 0 12 12"
              fill="currentColor"
              className="w-2.5 h-2.5"
            >
              <path d="M6 1l1.5 2.5L10 2l-.5 3.5L6 7 2.5 5.5 2 2l2.5 1.5L6 1z" />
            </svg>
          </span>
        )}
      </div>

      <div className="collab-list-info">
        <div className="collab-list-name">
          {displayName}
          {isOwner && <span className="collab-list-role-badge">Owner</span>}
          {isPending && (
            <span className="collab-list-pending-badge">Pending</span>
          )}
        </div>
        {name && email && <div className="collab-list-email">{email}</div>}
      </div>

      <div className="collab-list-actions">
        {canRemove && !isOwner && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            disabled={isRemoving}
            className="collab-list-remove-btn"
            aria-label={`Remove ${displayName}`}
          >
            {isRemoving ? (
              <Spinner className="w-3.5 h-3.5" />
            ) : (
              <Cross2Icon className="w-3.5 h-3.5" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
});

export function CollaboratorList({
  isOwner,
  owner,
  collaborators,
  removingCollaboratorId,
  onRemove,
}: CollaboratorListProps) {
  return (
    <div className="collab-list">
      <CollaboratorRow
        name={owner.name}
        email=""
        image={owner.image}
        isPending={false}
        isOwner={true}
        canRemove={false}
        isRemoving={false}
      />

      {collaborators.map((collaborator) => (
        <CollaboratorRow
          key={collaborator.id}
          collaboratorId={collaborator.id}
          name={collaborator.userName}
          email={collaborator.email}
          image={collaborator.userImage}
          isPending={collaborator.userId === null}
          isOwner={false}
          canRemove={isOwner}
          isRemoving={removingCollaboratorId === collaborator.id}
          onRemove={onRemove}
        />
      ))}

      {collaborators.length === 0 && (
        <div className="collab-list-empty">
          <PersonIcon className="w-5 h-5 text-muted-foreground/50" />
          <p>No collaborators yet</p>
        </div>
      )}
    </div>
  );
}
