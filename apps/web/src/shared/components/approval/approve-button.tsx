import { CheckIcon } from '@radix-ui/react-icons';
import { Spinner } from '@repo/ui/components/spinner';

export interface ApproveButtonProps {
  isApproved: boolean;
  isAdmin: boolean;
  onApprove: () => void;
  onRevoke: () => void;
  isPending: boolean;
}

/**
 * Admin-only approval toggle button.
 *
 * - Admin + not approved: shows "Approve" button
 * - Admin + approved: shows "Approved" toggle (click to revoke)
 * - Non-admin + approved: shows "Approved" badge (read-only)
 * - Non-admin + not approved: renders nothing
 */
export function ApproveButton({
  isApproved,
  isAdmin,
  onApprove,
  onRevoke,
  isPending,
}: ApproveButtonProps) {
  // Non-admin and not approved: nothing to show
  if (!isAdmin && !isApproved) return null;

  // Non-admin but approved: read-only badge
  if (!isAdmin && isApproved) {
    return (
      <span className="approve-btn approve-btn-approved approve-btn-readonly">
        <span className="approve-btn-track">
          <span className="approve-btn-thumb">
            <CheckIcon className="approve-btn-icon" />
          </span>
        </span>
        <span className="approve-btn-label">Approved</span>
      </span>
    );
  }

  // Admin: interactive toggle
  const handleClick = () => {
    if (isPending) return;
    if (isApproved) {
      onRevoke();
    } else {
      onApprove();
    }
  };

  const labelText = isPending
    ? isApproved
      ? 'Revoking...'
      : 'Approving...'
    : isApproved
      ? 'Approved'
      : 'Approve';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`approve-btn ${isApproved ? 'approve-btn-approved' : 'approve-btn-pending'}`}
      aria-label={isApproved ? 'Revoke approval' : 'Approve'}
      aria-pressed={isApproved}
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
