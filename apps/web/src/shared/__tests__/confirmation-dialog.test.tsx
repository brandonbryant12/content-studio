import { describe, it, expect, vi } from 'vitest';
import { ConfirmationDialog } from '../components/confirmation-dialog';
import { render, screen, userEvent } from '@/test-utils';

describe('ConfirmationDialog', () => {
  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Test Title',
    description: 'Test Description',
    confirmText: 'Confirm',
    onConfirm: vi.fn(),
  };

  it('does not render content when open=false', () => {
    render(<ConfirmationDialog {...baseProps} open={false} />);

    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
  });

  it('renders the dialog and closes when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ConfirmationDialog {...baseProps} onOpenChange={onOpenChange} />,
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('triggers the confirm handler when confirm is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmationDialog {...baseProps} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it('shows a loading state and blocks both actions when isLoading=true', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmationDialog
        {...baseProps}
        isLoading={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('Processing...')).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    const confirmButton = screen.getByRole('button', { name: /processing/i });

    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();

    await user.click(cancelButton);
    await user.click(confirmButton);

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
