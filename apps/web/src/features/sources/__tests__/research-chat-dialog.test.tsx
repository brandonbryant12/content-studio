import { describe, expect, it, vi } from 'vitest';
import type { UIMessage } from 'ai';
import type { ComponentProps } from 'react';
import { ResearchChatDialog } from '../components/research-chat-dialog';
import { render, screen, userEvent } from '@/test-utils';

type ResearchChatDialogProps = ComponentProps<typeof ResearchChatDialog>;

const messagesFixture: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    parts: [{ type: 'text', text: 'AI in healthcare' }],
  },
  {
    id: 'msg-2',
    role: 'assistant',
    parts: [
      { type: 'text', text: 'What aspect of AI in healthcare interests you?' },
    ],
  },
];

const createProps = (
  overrides: Partial<ResearchChatDialogProps> = {},
): ResearchChatDialogProps => ({
  open: true,
  onOpenChange: vi.fn(),
  messages: [],
  isStreaming: false,
  error: undefined,
  canStartResearch: false,
  autoStartReady: false,
  startError: undefined,
  onSendMessage: vi.fn(),
  onStartResearch: vi.fn(),
  isStartingResearch: false,
  autoGeneratePodcast: false,
  onAutoGeneratePodcastChange: vi.fn(),
  followUpCount: 0,
  followUpLimit: 2,
  onKeepRefining: vi.fn(),
  ...overrides,
});

const renderDialog = (overrides: Partial<ResearchChatDialogProps> = {}) =>
  render(<ResearchChatDialog {...createProps(overrides)} />);

describe('ResearchChatDialog', () => {
  it('handles composer submit and multiline editing semantics', async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();
    renderDialog({ onSendMessage });

    const input = screen.getByRole('textbox', { name: 'Research topic' });

    await user.type(input, 'Test topic');
    await user.keyboard('{Enter}');

    expect(onSendMessage).toHaveBeenCalledWith('Test topic');
    expect(input).toHaveValue('');

    await user.type(input, 'Line one');
    await user.keyboard('{Shift>}{Enter}{/Shift}Line two');

    expect(onSendMessage).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('Line one\nLine two');
  });

  it('supports manual start flow with progress badge and start action', async () => {
    const user = userEvent.setup();
    const onStartResearch = vi.fn();

    renderDialog({
      messages: messagesFixture,
      canStartResearch: true,
      followUpCount: 1,
      followUpLimit: 2,
      onStartResearch,
    });

    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start Research' }));
    expect(onStartResearch).toHaveBeenCalledTimes(1);
  });

  it('disables interaction while research preparation is in-flight', () => {
    renderDialog({
      messages: messagesFixture,
      canStartResearch: true,
      isStartingResearch: true,
    });

    expect(
      screen.getByRole('textbox', { name: 'Research topic' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('checkbox', {
        name: 'Create a podcast when research completes',
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /preparing research/i }),
    ).toBeDisabled();
  });

  it('shows retry affordance when starting research fails', async () => {
    const user = userEvent.setup();
    const onStartResearch = vi.fn();

    renderDialog({
      messages: messagesFixture,
      canStartResearch: true,
      startError: new Error('Failed'),
      onStartResearch,
    });

    expect(
      screen.getByText('Failed to start research. Please try again.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onStartResearch).toHaveBeenCalledTimes(1);
  });

  it('supports auto-start confirmation to keep refining or proceed', async () => {
    const user = userEvent.setup();
    const onStartResearch = vi.fn();
    const onKeepRefining = vi.fn();

    renderDialog({
      messages: messagesFixture,
      canStartResearch: true,
      autoStartReady: true,
      onStartResearch,
      onKeepRefining,
    });

    await user.click(screen.getByRole('button', { name: 'Keep Refining' }));
    expect(onKeepRefining).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Start Research' }));
    expect(onStartResearch).toHaveBeenCalledTimes(1);
  });
});
