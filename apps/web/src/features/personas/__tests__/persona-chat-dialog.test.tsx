import { describe, expect, it, vi } from 'vitest';
import type { UIMessage } from 'ai';
import type { ComponentProps } from 'react';
import { PersonaChatDialog } from '../components/persona-chat-dialog';
import { render, screen, userEvent } from '@/test-utils';

type PersonaChatDialogProps = ComponentProps<typeof PersonaChatDialog>;

const defaultProps: PersonaChatDialogProps = {
  open: true,
  onOpenChange: vi.fn(),
  messages: [],
  isStreaming: false,
  error: undefined,
  createError: undefined,
  canCreatePersona: false,
  autoCreateReady: false,
  onSendMessage: vi.fn(),
  onCreatePersona: vi.fn(),
  isCreatingPersona: false,
  followUpCount: 0,
  followUpLimit: 2,
  onKeepRefining: vi.fn(),
};

const renderDialog = (overrides: Partial<PersonaChatDialogProps> = {}) =>
  render(<PersonaChatDialog {...defaultProps} {...overrides} />);

const messagesFixture: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    parts: [{ type: 'text', text: 'A warm science host' }],
  },
  {
    id: 'msg-2',
    role: 'assistant',
    parts: [{ type: 'text', text: 'What tone should they use?' }],
  },
];

describe('PersonaChatDialog', () => {
  it('supports the manual create path and trims follow-up messages', async () => {
    const user = userEvent.setup();
    const onCreatePersona = vi.fn();
    const onSendMessage = vi.fn();

    renderDialog({
      messages: messagesFixture,
      canCreatePersona: true,
      followUpCount: 1,
      onCreatePersona,
      onSendMessage,
    });

    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();

    await user.type(
      screen.getByLabelText('Persona description'),
      '  Add a more conversational tone  ',
    );
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(onSendMessage).toHaveBeenCalledWith(
      'Add a more conversational tone',
    );

    await user.click(screen.getByRole('button', { name: 'Create Persona' }));

    expect(onCreatePersona).toHaveBeenCalled();
  });

  it('walks the pending and retry states in the manual create flow', () => {
    const { rerender } = renderDialog({
      messages: messagesFixture,
      canCreatePersona: true,
      isCreatingPersona: true,
    });

    expect(screen.getByText('Creating persona...')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /creating persona/i }),
    ).toBeDisabled();
    expect(screen.getByLabelText('Persona description')).toBeDisabled();

    rerender(
      <PersonaChatDialog
        {...defaultProps}
        messages={messagesFixture}
        canCreatePersona={true}
        createError={new Error('Failed')}
      />,
    );

    expect(
      screen.getByText('Failed to create persona. Please try again.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
    expect(screen.getByLabelText('Persona description')).toBeEnabled();
  });

  it('uses the auto-trigger confirmation path to confirm or keep refining', async () => {
    const user = userEvent.setup();
    const onCreatePersona = vi.fn();
    const onKeepRefining = vi.fn();

    renderDialog({
      messages: messagesFixture,
      canCreatePersona: true,
      autoCreateReady: true,
      onCreatePersona,
      onKeepRefining,
    });

    expect(screen.getByText('Ready to proceed?')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create Persona' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Keep Refining' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Keep Refining' }));
    expect(onKeepRefining).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Create Persona' }));
    expect(onCreatePersona).toHaveBeenCalledTimes(1);
  });
});
