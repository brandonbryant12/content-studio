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
  it('calls onCreatePersona when clicking Create Persona', async () => {
    const user = userEvent.setup();
    const onCreatePersona = vi.fn();

    renderDialog({
      messages: messagesFixture,
      canCreatePersona: true,
      onCreatePersona,
    });

    await user.click(screen.getByRole('button', { name: 'Create Persona' }));
    expect(onCreatePersona).toHaveBeenCalled();
  });

  it('shows creating state while creating persona', () => {
    renderDialog({
      messages: messagesFixture,
      canCreatePersona: true,
      isCreatingPersona: true,
    });

    expect(screen.getByText('Creating persona...')).toBeInTheDocument();
  });

  it('shows create error when provided', () => {
    renderDialog({
      messages: messagesFixture,
      canCreatePersona: true,
      createError: new Error('Failed'),
    });

    expect(
      screen.getByText('Failed to create persona. Please try again.'),
    ).toBeInTheDocument();
  });

  it('shows auto-trigger confirmation when autoCreateReady', () => {
    renderDialog({
      messages: messagesFixture,
      canCreatePersona: true,
      autoCreateReady: true,
    });

    expect(screen.getByText('Ready to proceed?')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create Persona' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Keep Refining')).toBeInTheDocument();
  });

  it('calls onKeepRefining in auto-trigger mode', async () => {
    const user = userEvent.setup();
    const onKeepRefining = vi.fn();

    renderDialog({
      messages: messagesFixture,
      canCreatePersona: true,
      autoCreateReady: true,
      onKeepRefining,
    });

    await user.click(screen.getByText('Keep Refining'));
    expect(onKeepRefining).toHaveBeenCalled();
  });

  it('disables input while creating persona', () => {
    renderDialog({
      messages: messagesFixture,
      canCreatePersona: true,
      isCreatingPersona: true,
    });

    const input = screen.getByLabelText('Persona description');
    expect(input).toBeDisabled();
  });
});
