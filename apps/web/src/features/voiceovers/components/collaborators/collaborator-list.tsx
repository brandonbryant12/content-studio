// features/voiceovers/components/collaborators/collaborator-list.tsx

import { CheckIcon, Cross2Icon, PersonIcon } from '@radix-ui/react-icons';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@repo/ui/components/avatar';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { memo, useCallback } from 'react';
import type { Collaborator } from '../../hooks/use-collaborators';
import { useRemoveCollaborator } from '../../hooks/use-remove-collaborator';

interface Owner {
  id: string;
  name: string;
  image?: string | null;
  hasApproved: boolean;
}

export interface CollaboratorListProps {
  voiceoverId: string;
  isOwner: boolean;
  owner: Owner;
  collaborators: Collaborator[];
}

function getInitials(name: string | null, email: string): string {
  if (name && name.length > 0) {
    const parts = name.split(' ').filter((p) => p.length > 0);
    const first = parts[0];
    const second = parts[1];
    if (parts.length >= 2 && first && second) {
      return (first.charAt(0) + second.charAt(0)).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email && email.length > 0) {
    return email.charAt(0).toUpperCase();
  }
  return '?';
}

interface CollaboratorRowProps {
  collaboratorId?: string;
  name: string | null;
  email: string;
  image: string | null | undefined;
  hasApproved: boolean;
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
  hasApproved,
  isPending,
  isOwner,
  canRemove,
  isRemoving,
  onRemove,
}: CollaboratorRowProps) {
  const displayName = name || email;
  const initials = getInitials(name, email);
  const avatarClass = isPending
    ? 'collab-list-avatar collab-avatar-pending'
    : 'collab-list-avatar';
  const fallbackClass = isPending
    ? 'collab-avatar-fallback collab-fallback-pending'
    : 'collab-avatar-fallback';

  const handleClick = useCallback(() => {
    if (collaboratorId && onRemove) {
      onRemove(collaboratorId);
    }
  }, [collaboratorId, onRemove]);

  return (
    <div className="collab-list-row">
      {/* Avatar with badges */}
      <div className="collab-list-avatar-wrapper">
        <Avatar className={avatarClass}>
          {image ? <AvatarImage src={image} alt={displayName} /> : null}
          <AvatarFallback className={fallbackClass}>
            {isPending ? (
              <PersonIcon className="w-4 h-4 text-muted-foreground" />
            ) : (
              initials
            )}
          </AvatarFallback>
        </Avatar>

        {/* Approval badge */}
        {hasApproved && (
          <span className="collab-list-approved-badge">
            <CheckIcon className="w-2.5 h-2.5" />
          </span>
        )}

        {/* Owner crown */}
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

      {/* Info */}
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

      {/* Status & Actions */}
      <div className="collab-list-actions">
        {hasApproved && (
          <span className="collab-list-status collab-list-status-approved">
            Approved
          </span>
        )}

        {canRemove && !isOwner && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            disabled={isRemoving}
            className="collab-list-remove-btn"
            aria-label={'Remove ' + displayName}
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
    <div className="collab-list">
      {/* Owner row - always first, never removable */}
      <CollaboratorRow
        name={owner.name}
        email=""
        image={owner.image}
        hasApproved={owner.hasApproved}
        isPending={false}
        isOwner={true}
        canRemove={false}
        isRemoving={false}
      />

      {/* Collaborator rows */}
      {collaborators.map((collaborator) => (
        <CollaboratorRow
          key={collaborator.id}
          collaboratorId={collaborator.id}
          name={collaborator.userName}
          email={collaborator.email}
          image={collaborator.userImage}
          hasApproved={collaborator.hasApproved}
          isPending={collaborator.userId === null}
          isOwner={false}
          canRemove={isOwner}
          isRemoving={
            isRemoving && variables?.collaboratorId === collaborator.id
          }
          onRemove={handleRemove}
        />
      ))}

      {/* Empty state */}
      {collaborators.length === 0 && (
        <div className="collab-list-empty">
          <PersonIcon className="w-5 h-5 text-muted-foreground/50" />
          <p>No collaborators yet</p>
        </div>
      )}
    </div>
  );
}
