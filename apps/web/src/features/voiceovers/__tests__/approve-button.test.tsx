// features/voiceovers/__tests__/approve-button.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ApproveButton,
  type ApproveButtonProps,
} from '@/shared/components/approval/approve-button';
import { render, screen, fireEvent } from '@/test-utils';

// Mock the Spinner component
vi.mock('@repo/ui/components/spinner', () => ({
  Spinner: ({ size, className }: { size?: string; className?: string }) => (
    <span data-testid="spinner" data-size={size} className={className}>
      Loading...
    </span>
  ),
}));

function createDefaultProps(
  overrides: Partial<ApproveButtonProps> = {},
): ApproveButtonProps {
  return {
    isApproved: false,
    isAdmin: true,
    onApprove: vi.fn(),
    onRevoke: vi.fn(),
    isPending: false,
    ...overrides,
  };
}

describe('ApproveButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('admin behavior', () => {
    it('shows "Approve" when not approved', () => {
      render(<ApproveButton {...createDefaultProps({ isApproved: false })} />);

      expect(screen.getByText('Approve')).toBeInTheDocument();
    });

    it('shows "Approved" when approved', () => {
      render(<ApproveButton {...createDefaultProps({ isApproved: true })} />);

      expect(screen.getByText('Approved')).toBeInTheDocument();
    });

    it('has correct aria-label when not approved', () => {
      render(<ApproveButton {...createDefaultProps({ isApproved: false })} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Approve');
    });

    it('has correct aria-label when approved', () => {
      render(<ApproveButton {...createDefaultProps({ isApproved: true })} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Revoke approval');
    });

    it('has correct aria-pressed state', () => {
      const { rerender } = render(
        <ApproveButton {...createDefaultProps({ isApproved: false })} />,
      );

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-pressed',
        'false',
      );

      rerender(<ApproveButton {...createDefaultProps({ isApproved: true })} />);

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });

    it('calls onApprove when clicked and not approved', () => {
      const onApprove = vi.fn();
      const onRevoke = vi.fn();

      render(
        <ApproveButton
          {...createDefaultProps({ isApproved: false, onApprove, onRevoke })}
        />,
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(onApprove).toHaveBeenCalled();
      expect(onRevoke).not.toHaveBeenCalled();
    });

    it('calls onRevoke when clicked and approved', () => {
      const onApprove = vi.fn();
      const onRevoke = vi.fn();

      render(
        <ApproveButton
          {...createDefaultProps({ isApproved: true, onApprove, onRevoke })}
        />,
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(onRevoke).toHaveBeenCalled();
      expect(onApprove).not.toHaveBeenCalled();
    });

    it('shows loading state when approving', () => {
      render(
        <ApproveButton
          {...createDefaultProps({ isApproved: false, isPending: true })}
        />,
      );

      expect(screen.getByText('Approving...')).toBeInTheDocument();
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('shows loading state when revoking', () => {
      render(
        <ApproveButton
          {...createDefaultProps({ isApproved: true, isPending: true })}
        />,
      );

      expect(screen.getByText('Revoking...')).toBeInTheDocument();
      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('is disabled when loading', () => {
      render(
        <ApproveButton
          {...createDefaultProps({ isApproved: false, isPending: true })}
        />,
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('does not call callbacks when clicked during loading', () => {
      const onApprove = vi.fn();
      const onRevoke = vi.fn();

      render(
        <ApproveButton
          {...createDefaultProps({
            isApproved: false,
            onApprove,
            onRevoke,
            isPending: true,
          })}
        />,
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(onApprove).not.toHaveBeenCalled();
      expect(onRevoke).not.toHaveBeenCalled();
    });

    it('applies pending class when not approved', () => {
      render(<ApproveButton {...createDefaultProps({ isApproved: false })} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('approve-btn-pending');
    });

    it('applies approved class when approved', () => {
      render(<ApproveButton {...createDefaultProps({ isApproved: true })} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('approve-btn-approved');
    });
  });

  describe('non-admin behavior', () => {
    it('renders nothing when not approved and not admin', () => {
      const { container } = render(
        <ApproveButton
          {...createDefaultProps({ isApproved: false, isAdmin: false })}
        />,
      );

      expect(container.innerHTML).toBe('');
    });

    it('shows read-only approved badge when approved and not admin', () => {
      render(
        <ApproveButton
          {...createDefaultProps({ isApproved: true, isAdmin: false })}
        />,
      );

      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});
