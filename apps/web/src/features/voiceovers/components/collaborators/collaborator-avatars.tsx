// features/voiceovers/components/collaborators/collaborator-avatars.tsx

import { CheckIcon, PersonIcon } from '@radix-ui/react-icons';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@repo/ui/components/avatar';

interface Owner {
  id: string;
  name: string;
  image?: string | null;
  hasApproved: boolean;
}

interface CollaboratorData {
  id: string;
  voiceoverId: string;
  userId: string | null;
  email: string;
  userName: string | null;
  userImage: string | null;
  hasApproved: boolean;
}

export interface CollaboratorAvatarsProps {
  owner: Owner;
  collaborators: readonly CollaboratorData[];
  onManageClick?: () => void;
}

const MAX_VISIBLE = 4;

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

function getTooltipText(
  name: string | null,
  email: string,
  hasApproved: boolean,
  isOwner: boolean,
): string {
  const displayName = name || email;
  const roleText = isOwner ? ' (Owner)' : '';
  const approvalText = hasApproved ? ' - Approved' : '';
  return displayName + roleText + approvalText;
}

interface AvatarItemProps {
  name: string | null;
  email: string;
  image: string | null | undefined;
  hasApproved: boolean;
  isPending: boolean;
  isOwner: boolean;
  index: number;
}

function AvatarItem({
  name,
  email,
  image,
  hasApproved,
  isPending,
  isOwner,
  index,
}: AvatarItemProps) {
  const initials = getInitials(name, email);
  const tooltipText = getTooltipText(name, email, hasApproved, isOwner);
  const pendingClass = isPending ? 'collab-avatar-pending' : '';
  const ownerClass = isOwner ? 'collab-avatar-owner' : '';
  const fallbackPendingClass = isPending ? 'collab-fallback-pending' : '';

  return (
    <div
      className="collab-avatar-item"
      style={{ zIndex: 10 - index }}
      title={tooltipText}
    >
      <Avatar
        className={'collab-avatar ' + pendingClass + ' ' + ownerClass}
      >
        {image ? <AvatarImage src={image} alt={name || email} /> : null}
        <AvatarFallback
          className={'collab-avatar-fallback ' + fallbackPendingClass}
        >
          {isPending ? (
            <PersonIcon className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            initials
          )}
        </AvatarFallback>
      </Avatar>

      {/* Approval checkmark badge */}
      {hasApproved && (
        <span className="collab-approved-badge">
          <CheckIcon className="w-2.5 h-2.5" />
        </span>
      )}

      {/* Owner crown indicator */}
      {isOwner && (
        <span className="collab-owner-badge">
          <svg viewBox="0 0 12 12" fill="currentColor" className="w-2.5 h-2.5">
            <path d="M6 1l1.5 2.5L10 2l-.5 3.5L6 7 2.5 5.5 2 2l2.5 1.5L6 1z" />
          </svg>
        </span>
      )}
    </div>
  );
}

export function CollaboratorAvatars({
  owner,
  collaborators,
  onManageClick,
}: CollaboratorAvatarsProps) {
  const visibleCollaborators = collaborators.slice(0, MAX_VISIBLE - 1);
  const remainingCount = collaborators.length - visibleCollaborators.length;
  const totalCount = 1 + collaborators.length; // owner + collaborators
  const ariaLabel = totalCount + ' collaborator' + (totalCount !== 1 ? 's' : '') + '. Click to manage.';
  const overflowTitle = remainingCount + ' more collaborator' + (remainingCount !== 1 ? 's' : '');

  return (
    <button
      type="button"
      onClick={onManageClick}
      className="collab-avatars-group"
      aria-label={ariaLabel}
    >
      {/* Owner avatar (always first) */}
      <AvatarItem
        name={owner.name}
        email=""
        image={owner.image}
        hasApproved={owner.hasApproved}
        isPending={false}
        isOwner={true}
        index={0}
      />

      {/* Collaborator avatars */}
      {visibleCollaborators.map((collaborator, idx) => (
        <AvatarItem
          key={collaborator.id}
          name={collaborator.userName}
          email={collaborator.email}
          image={collaborator.userImage}
          hasApproved={collaborator.hasApproved}
          isPending={collaborator.userId === null}
          isOwner={false}
          index={idx + 1}
        />
      ))}

      {/* Overflow count */}
      {remainingCount > 0 && (
        <div
          className="collab-avatar-item collab-overflow"
          style={{ zIndex: 10 - MAX_VISIBLE }}
          title={overflowTitle}
        >
          <div className="collab-avatar-overflow">
            <span className="collab-overflow-text">+{remainingCount}</span>
          </div>
        </div>
      )}
    </button>
  );
}
