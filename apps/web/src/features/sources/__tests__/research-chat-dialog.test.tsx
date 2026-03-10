import { describe, it, expect, vi } from 'vitest';
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

const getSuggestionChips = () =>
  screen
    .getByText(
      'What topic should become a reusable research source? Try one of these:',
    )
    .closest('div')
    ?.querySelectorAll('button') ?? [];

describe('ResearchChatDialog', () => {
  it('renders dialog title and empty-state topic chips', () => {
    renderDialog();

    expect(screen.getByText('Deep Research')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Describe a topic and AI will create a reusable research source with citations you can review and reuse later.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'What topic should become a reusable research source? Try one of these:',
      ),
    ).toBeInTheDocument();
    // 3 randomly selected topic chips are rendered
    const chips = getSuggestionChips();
    expect(chips).toHaveLength(3);
  });

  it('renders existing messages when provided', () => {
    renderDialog({ messages: messagesFixture, canStartResearch: true });

    expect(screen.getByText('AI in healthcare')).toBeInTheDocument();
    expect(
      screen.getByText('What aspect of AI in healthcare interests you?'),
    ).toBeInTheDocument();
  });

  it('sends message on Enter and clears input', async () => {
    const onSendMessage = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onSendMessage });

    const input = screen.getByPlaceholderText(
      'Describe your research topic...',
    );
    await user.type(input, 'Test topic');
    await user.keyboard('{Enter}');

    expect(onSendMessage).toHaveBeenCalledWith('Test topic');
    expect(input).toHaveValue('');
  });

  it('adds newline on Shift+Enter without submitting', async () => {
    const onSendMessage = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onSendMessage });

    const input = screen.getByPlaceholderText(
      'Describe your research topic...',
    );
    await user.type(input, 'Line one');
    await user.keyboard('{Shift>}{Enter}{/Shift}Line two');

    expect(onSendMessage).not.toHaveBeenCalled();
    expect(input).toHaveValue('Line one\nLine two');
  });

  it.each([
    { name: 'streaming', isStreaming: true, isStartingResearch: false },
    {
      name: 'research preparation',
      isStreaming: false,
      isStartingResearch: true,
    },
  ])('disables input while $name', ({ isStreaming, isStartingResearch }) => {
    renderDialog({
      messages: messagesFixture,
      canStartResearch: true,
      isStreaming,
      isStartingResearch,
    });

    expect(screen.getByLabelText('Research topic')).toBeDisabled();
  });

  it('uses high maxLength on multiline input', () => {
    renderDialog();
    expect(
      screen.getByPlaceholderText('Describe your research topic...'),
    ).toHaveAttribute('maxLength', '12000');
  });

  it.each([
    {
      name: 'default prompt when still collecting details',
      canStartResearch: false,
      expectedPlaceholder: 'Describe your research topic...',
    },
    {
      name: 'follow-up prompt when research can start',
      canStartResearch: true,
      expectedPlaceholder: 'Add more details or click Start Research...',
    },
  ])('$name', ({ canStartResearch, expectedPlaceholder }) => {
    renderDialog({ messages: messagesFixture, canStartResearch });
    expect(
      screen.getByPlaceholderText(expectedPlaceholder),
    ).toBeInTheDocument();
  });

  it.each([
    {
      name: 'shows Start Research button when allowed',
      canStartResearch: true,
      shouldShow: true,
    },
    {
      name: 'hides Start Research button when not allowed',
      canStartResearch: false,
      shouldShow: false,
    },
  ])('$name', ({ canStartResearch, shouldShow }) => {
    renderDialog({ messages: messagesFixture, canStartResearch });

    const startButton = screen.queryByText('Start Research');
    if (shouldShow) {
      expect(startButton).toBeInTheDocument();
    } else {
      expect(startButton).not.toBeInTheDocument();
    }
  });

  it('calls onStartResearch when clicking Start Research', async () => {
    const onStartResearch = vi.fn();
    const user = userEvent.setup();
    renderDialog({
      messages: messagesFixture,
      canStartResearch: true,
      onStartResearch,
    });

    await user.click(screen.getByText('Start Research'));
    expect(onStartResearch).toHaveBeenCalled();
  });

  it('shows preparing state while starting research', () => {
    renderDialog({
      messages: messagesFixture,
      canStartResearch: true,
      isStartingResearch: true,
    });

    expect(screen.getByText('Preparing research...')).toBeInTheDocument();
  });

  it('shows stream error message', () => {
    renderDialog({
      messages: messagesFixture,
      error: new Error('Stream failed'),
    });

    expect(
      screen.getByText('Something went wrong. Please try again.'),
    ).toBeInTheDocument();
  });

  it('shows start error message when start fails', () => {
    renderDialog({
      messages: messagesFixture,
      canStartResearch: true,
      startError: new Error('Failed'),
    });

    expect(
      screen.getByText('Failed to start research. Please try again.'),
    ).toBeInTheDocument();
  });

  it('sends example topic when chip is clicked', async () => {
    const onSendMessage = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onSendMessage });

    const chips = getSuggestionChips();
    const firstChip = chips[0]!;
    await user.click(firstChip);
    expect(onSendMessage).toHaveBeenCalledWith(firstChip.textContent);
  });

  it('shows auto-trigger confirmation and handles Keep Refining', async () => {
    const onKeepRefining = vi.fn();
    const user = userEvent.setup();
    renderDialog({
      messages: messagesFixture,
      canStartResearch: true,
      autoStartReady: true,
      onKeepRefining,
    });

    expect(screen.getByText('Ready to proceed?')).toBeInTheDocument();
    expect(screen.getByText('Start Research')).toBeInTheDocument();
    expect(screen.getByText('Keep Refining')).toBeInTheDocument();

    await user.click(screen.getByText('Keep Refining'));
    expect(onKeepRefining).toHaveBeenCalled();
  });

  it.each([
    {
      name: 'shows progress badge for follow-up questions',
      followUpCount: 1,
      autoStartReady: false,
      shouldShow: true,
      label: 'Question 1 of 2',
    },
    {
      name: 'hides progress badge once auto-start is ready',
      followUpCount: 2,
      autoStartReady: true,
      shouldShow: false,
      label: 'Question 2 of 2',
    },
  ])('$name', ({ followUpCount, autoStartReady, shouldShow, label }) => {
    renderDialog({
      messages: messagesFixture,
      canStartResearch: true,
      followUpCount,
      autoStartReady,
      followUpLimit: 2,
    });

    const badge = screen.queryByText(label);
    if (shouldShow) {
      expect(badge).toBeInTheDocument();
    } else {
      expect(badge).not.toBeInTheDocument();
    }
  });

  it('calls onAutoGeneratePodcastChange when checkbox is toggled', async () => {
    const user = userEvent.setup();
    const onAutoGeneratePodcastChange = vi.fn();
    renderDialog({ onAutoGeneratePodcastChange });

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Auto-generate podcast from findings',
      }),
    );

    expect(onAutoGeneratePodcastChange).toHaveBeenCalledWith(true);
  });
});
