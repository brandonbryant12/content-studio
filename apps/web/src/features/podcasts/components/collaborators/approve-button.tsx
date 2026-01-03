// features/podcasts/components/collaborators/approve-button.tsx

import { CheckIcon } from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';
import { useApprovePodcast } from '../../hooks/use-approve-podcast';

export interface ApproveButtonProps {
  podcastId: string;
  userId: string;
  hasApproved: boolean;
}

/**
 * A toggle button for approving/revoking podcast approval.
 * Features a satisfying state transition with visual feedback.
 */
export function ApproveButton({
  podcastId,
  userId,
  hasApproved,
}: ApproveButtonProps) {
  const { approve, revoke } = useApprovePodcast(podcastId, userId);
  const isLoading = approve.isPending || revoke.isPending;

  const handleClick = () => {
    if (isLoading) return;

    if (hasApproved) {
      revoke.mutate({ id: podcastId });
    } else {
      approve.mutate({ id: podcastId });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={`approve-btn ${hasApproved ? 'approve-btn-approved' : 'approve-btn-pending'}`}
      aria-label={hasApproved ? 'Revoke approval' : 'Approve podcast'}
      aria-pressed={hasApproved}
    >
      <span className="approve-btn-track">
        <span className="approve-btn-thumb">
          {isLoading ? (
            <Spinner size="sm" className="approve-btn-spinner" />
          ) : (
            <CheckIcon className="approve-btn-icon" />
          )}
        </span>
      </span>
      <span className="approve-btn-label">
        {isLoading
          ? hasApproved
            ? 'Revoking...'
            : 'Approving...'
          : hasApproved
            ? 'Approved'
            : 'Approve'}
      </span>
    </button>
  );
}
