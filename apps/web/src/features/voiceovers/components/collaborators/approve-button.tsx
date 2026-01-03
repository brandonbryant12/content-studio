// features/voiceovers/components/collaborators/approve-button.tsx

import { CheckIcon } from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';

export interface ApproveButtonProps {
  hasApproved: boolean;
  onApprove: () => void;
  onRevoke: () => void;
  isPending: boolean;
}

/**
 * A toggle button for approving/revoking voiceover approval.
 * Features a satisfying state transition with visual feedback.
 *
 * This is a presenter component - it receives callbacks as props instead of
 * using hooks directly, enabling easy testing.
 */
export function ApproveButton({
  hasApproved,
  onApprove,
  onRevoke,
  isPending,
}: ApproveButtonProps) {
  const handleClick = () => {
    if (isPending) return;

    if (hasApproved) {
      onRevoke();
    } else {
      onApprove();
    }
  };

  const buttonClass = hasApproved
    ? 'approve-btn approve-btn-approved'
    : 'approve-btn approve-btn-pending';
  const ariaLabel = hasApproved ? 'Revoke approval' : 'Approve voiceover';
  const labelText = isPending
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
      disabled={isPending}
      className={buttonClass}
      aria-label={ariaLabel}
      aria-pressed={hasApproved}
    >
      <span className="approve-btn-track">
        <span className="approve-btn-thumb">
          {isPending ? (
            <Spinner size="sm" className="approve-btn-spinner" />
          ) : (
            <CheckIcon className="approve-btn-icon" />
          )}
        </span>
      </span>
      <span className="approve-btn-label">{labelText}</span>
    </button>
  );
}
