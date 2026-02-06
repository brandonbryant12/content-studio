import { CheckIcon } from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';

export interface ApproveButtonProps {
  hasApproved: boolean;
  onApprove: () => void;
  onRevoke: () => void;
  isPending: boolean;
}

/**
 * A toggle button for approving/revoking podcast approval.
 * Presenter component - receives callbacks as props.
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
      className={`approve-btn ${hasApproved ? 'approve-btn-approved' : 'approve-btn-pending'}`}
      aria-label={hasApproved ? 'Revoke approval' : 'Approve podcast'}
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
