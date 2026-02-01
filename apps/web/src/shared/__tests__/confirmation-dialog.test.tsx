// shared/__tests__/confirmation-dialog.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { ConfirmationDialog } from '../components/confirmation-dialog';
import { render, screen, fireEvent } from '@/test-utils';

describe('ConfirmationDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Test Title',
    description: 'Test Description',
    confirmText: 'Confirm',
    onConfirm: vi.fn(),
  };

  it('does not render content when open=false', () => {
    render(<ConfirmationDialog {...defaultProps} open={false} />);

    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
    expect(screen.queryByText('Test Description')).not.toBeInTheDocument();
  });

  it('renders title and description when open=true', () => {
    render(<ConfirmationDialog {...defaultProps} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('cancel button calls onOpenChange(false)', () => {
    const onOpenChange = vi.fn();
    render(
      <ConfirmationDialog {...defaultProps} onOpenChange={onOpenChange} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('confirm button calls onConfirm', () => {
    const onConfirm = vi.fn();
    render(<ConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it('shows loading spinner and disables buttons when isLoading=true', () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmationDialog
        {...defaultProps}
        isLoading={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />,
    );

    // Check for loading text
    expect(screen.getByText('Processing...')).toBeInTheDocument();

    // Both buttons should be disabled
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    const confirmButton = screen.getByRole('button', { name: /processing/i });

    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();

    // Clicking disabled buttons should not trigger handlers
    fireEvent.click(cancelButton);
    fireEvent.click(confirmButton);

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('uses custom cancelText when provided', () => {
    render(<ConfirmationDialog {...defaultProps} cancelText="Go Back" />);

    expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cancel' }),
    ).not.toBeInTheDocument();
  });
});
