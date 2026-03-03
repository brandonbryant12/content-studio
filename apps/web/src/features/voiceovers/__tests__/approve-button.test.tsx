import { describe, it, expect, vi } from 'vitest';
import {
  ApproveButton,
  type ApproveButtonProps,
} from '@/shared/components/approval/approve-button';
import { render, screen, userEvent } from '@/test-utils';

vi.mock('@repo/ui/components/spinner', () => ({
  Spinner: ({ size, className }: { size?: string; className?: string }) => (
    <span data-testid="spinner" data-size={size} className={className}>
      Loading...
    </span>
  ),
}));

const createDefaultProps = (
  overrides: Partial<ApproveButtonProps> = {},
): ApproveButtonProps => ({
  isApproved: false,
  isAdmin: true,
  onApprove: vi.fn(),
  onRevoke: vi.fn(),
  isPending: false,
  ...overrides,
});

const renderApproveButton = (overrides: Partial<ApproveButtonProps> = {}) => {
  render(<ApproveButton {...createDefaultProps(overrides)} />);
  return { user: userEvent.setup() };
};

describe('ApproveButton', () => {
  it.each([
    {
      isApproved: false,
      label: 'Approve',
      ariaLabel: 'Approve',
      ariaPressed: 'false',
      className: 'approve-btn-pending',
    },
    {
      isApproved: true,
      label: 'Approved',
      ariaLabel: 'Revoke approval',
      ariaPressed: 'true',
      className: 'approve-btn-approved',
    },
  ])(
    'renders admin toggle state when isApproved=$isApproved',
    ({ isApproved, label, ariaLabel, ariaPressed, className }) => {
      renderApproveButton({ isApproved });

      const button = screen.getByRole('button');
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', ariaLabel);
      expect(button).toHaveAttribute('aria-pressed', ariaPressed);
      expect(button).toHaveClass(className);
    },
  );

  it.each([
    { isApproved: false, expectedCallback: 'onApprove' },
    { isApproved: true, expectedCallback: 'onRevoke' },
  ])(
    'calls the expected callback when isApproved=$isApproved',
    async ({ isApproved, expectedCallback }) => {
      const onApprove = vi.fn();
      const onRevoke = vi.fn();
      const { user } = renderApproveButton({ isApproved, onApprove, onRevoke });

      await user.click(screen.getByRole('button'));

      if (expectedCallback === 'onApprove') {
        expect(onApprove).toHaveBeenCalledTimes(1);
        expect(onRevoke).not.toHaveBeenCalled();
      } else {
        expect(onRevoke).toHaveBeenCalledTimes(1);
        expect(onApprove).not.toHaveBeenCalled();
      }
    },
  );

  it.each([
    { isApproved: false, pendingLabel: 'Approving...' },
    { isApproved: true, pendingLabel: 'Revoking...' },
  ])(
    'renders pending state and ignores clicks when isApproved=$isApproved',
    async ({ isApproved, pendingLabel }) => {
      const onApprove = vi.fn();
      const onRevoke = vi.fn();
      const { user } = renderApproveButton({
        isApproved,
        isPending: true,
        onApprove,
        onRevoke,
      });

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByText(pendingLabel)).toBeInTheDocument();
      expect(screen.getByTestId('spinner')).toBeInTheDocument();

      await user.click(button);
      expect(onApprove).not.toHaveBeenCalled();
      expect(onRevoke).not.toHaveBeenCalled();
    },
  );

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
