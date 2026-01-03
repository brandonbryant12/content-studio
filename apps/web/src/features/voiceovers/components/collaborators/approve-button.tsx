// features/voiceovers/components/collaborators/approve-button.tsx

import { CheckIcon } from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';
import { useApproveVoiceover } from '../../hooks/use-approve-voiceover';

export interface ApproveButtonProps {
  voiceoverId: string;
  userId: string;
  hasApproved: boolean;
}

/**
 * A toggle button for approving/revoking voiceover approval.
 * Features a satisfying state transition with visual feedback.
 */
export function ApproveButton({
  voiceoverId,
  userId,
  hasApproved,
}: ApproveButtonProps) {
  const { approve, revoke } = useApproveVoiceover(voiceoverId, userId);
  const isLoading = approve.isPending || revoke.isPending;

  const handleClick = () => {
    if (isLoading) return;

    if (hasApproved) {
      revoke.mutate({ id: voiceoverId });
    } else {
      approve.mutate({ id: voiceoverId });
    }
  };

  const buttonClass = hasApproved ? 'approve-btn approve-btn-approved' : 'approve-btn approve-btn-pending';
  const ariaLabel = hasApproved ? 'Revoke approval' : 'Approve voiceover';
  const labelText = isLoading
    ? hasApproved
      ? 'Revoking...'
      : 'Approving...'
    : hasApproved
      ? 'Approved'
      : 'Approve';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={buttonClass}
      aria-label={ariaLabel}
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
        {labelText}
      </span>
    </button>
  );
}
