import { describe, it, expect, vi } from 'vitest';
import type { UIMessage } from 'ai';
import type { ComponentProps } from 'react';
import { ResearchChatDialog } from '../components/research-chat-dialog';
import { render, screen, userEvent } from '@/test-utils';

type ResearchChatDialogProps = ComponentProps<typeof ResearchChatDialog>;

const defaultProps: ResearchChatDialogProps = {
  open: true,
  onOpenChange: vi.fn(),
  messages: [],
  isStreaming: false,
  error: undefined,
  canStartResearch: false,
  autoStartReady: false,
  synthesizeError: undefined,
  startError: undefined,
  onSendMessage: vi.fn(),
  onSynthesize: vi.fn(),
  isSynthesizing: false,
  preview: null,
  onConfirmResearch: vi.fn(),
  isStartingResearch: false,
  onDismissPreview: vi.fn(),
  autoGeneratePodcast: false,
  onAutoGeneratePodcastChange: vi.fn(),
  followUpCount: 0,
  followUpLimit: 2,
  onKeepRefining: vi.fn(),
};

const renderDialog = (overrides: Partial<ResearchChatDialogProps> = {}) =>
  render(<ResearchChatDialog {...defaultProps} {...overrides} />);

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

describe('ResearchChatDialog', () => {
  it('renders dialog with title when open', () => {
    renderDialog();
    expect(screen.getByText('Deep Research')).toBeInTheDocument();
  });

  it('shows empty state with example topics when no messages', () => {
    renderDialog();
    expect(
      screen.getByText('What would you like to research? Try one of these:'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('AI trends in healthcare 2026'),
    ).toBeInTheDocument();
  });

  it('displays messages when present', () => {
    renderDialog({ messages: messagesFixture, canStartResearch: true });
    expect(screen.getByText('AI in healthcare')).toBeInTheDocument();
    expect(
      screen.getByText('What aspect of AI in healthcare interests you?'),
    ).toBeInTheDocument();
  });

  it('calls onSendMessage when submitting input', async () => {
    const onSendMessage = vi.fn();
    const user = userEvent.setup();

    renderDialog({ onSendMessage });

    const input = screen.getByPlaceholderText(
      'Describe your research topic...',
    );
    await user.type(input, 'Test topic');
    await user.keyboard('{Enter}');

    expect(onSendMessage).toHaveBeenCalledWith('Test topic');
  });

  it('adds newline with Shift+Enter without submitting', async () => {
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

  it('applies a high maxLength for multiline input', () => {
    renderDialog();

    const input = screen.getByPlaceholderText(
      'Describe your research topic...',
    );
    expect(input).toHaveAttribute('maxLength', '12000');
  });

  it('clears input after sending', async () => {
    const user = userEvent.setup();

    renderDialog();

    const input = screen.getByPlaceholderText(
      'Describe your research topic...',
    );
    await user.type(input, 'Test topic');
    await user.keyboard('{Enter}');

    expect(input).toHaveValue('');
  });

  it('disables input while streaming', () => {
    renderDialog({ isStreaming: true });

    const input = screen.getByPlaceholderText(
      'Describe your research topic...',
    );
    expect(input).toBeDisabled();
  });

  it('shows Start Research button when canStartResearch is true', () => {
    renderDialog({ messages: messagesFixture, canStartResearch: true });

    expect(screen.getByText('Start Research')).toBeInTheDocument();
  });

  it('does not show Start Research button when canStartResearch is false', () => {
    renderDialog({ messages: messagesFixture, canStartResearch: false });

    expect(screen.queryByText('Start Research')).not.toBeInTheDocument();
  });

  it('calls onSynthesize when clicking Start Research', async () => {
    const onSynthesize = vi.fn();
    const user = userEvent.setup();

    renderDialog({
      messages: messagesFixture,
      canStartResearch: true,
      onSynthesize,
    });

    const startButton = screen.getByText('Start Research');
    await user.click(startButton);

    expect(onSynthesize).toHaveBeenCalled();
  });

  it('shows spinner when synthesizing', () => {
    renderDialog({
      messages: messagesFixture,
      canStartResearch: true,
      isSynthesizing: true,
    });

    expect(screen.getByText('Analyzing conversation...')).toBeInTheDocument();
  });

  it('shows error message when error is set', () => {
    renderDialog({
      messages: messagesFixture,
      error: new Error('Stream failed'),
    });

    expect(
      screen.getByText('Something went wrong. Please try again.'),
    ).toBeInTheDocument();
  });

  it('sends example topic when chip is clicked', async () => {
    const onSendMessage = vi.fn();
    const user = userEvent.setup();

    renderDialog({ onSendMessage });

    await user.click(screen.getByText('AI trends in healthcare 2026'));

    expect(onSendMessage).toHaveBeenCalledWith('AI trends in healthcare 2026');
  });

  it('changes placeholder when research can be started', () => {
    renderDialog({ messages: messagesFixture, canStartResearch: true });

    expect(
      screen.getByPlaceholderText(
        'Add more details or click Start Research...',
      ),
    ).toBeInTheDocument();
  });

  it('shows auto-trigger confirmation when autoStartReady', () => {
    renderDialog({
      messages: messagesFixture,
      canStartResearch: true,
      autoStartReady: true,
    });

    expect(screen.getByText('Ready to proceed?')).toBeInTheDocument();
    expect(screen.getByText('Start Research')).toBeInTheDocument();
    expect(screen.getByText('Keep Refining')).toBeInTheDocument();
  });

  it('calls onKeepRefining when Keep Refining is clicked in auto-trigger', async () => {
    const onKeepRefining = vi.fn();
    const user = userEvent.setup();

    renderDialog({
      messages: messagesFixture,
      canStartResearch: true,
      autoStartReady: true,
      onKeepRefining,
    });

    await user.click(screen.getByText('Keep Refining'));
    expect(onKeepRefining).toHaveBeenCalled();
  });

  it('shows progress badge when followUpCount > 0', () => {
    renderDialog({
      messages: messagesFixture,
      followUpCount: 1,
      followUpLimit: 2,
    });

    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
  });

  it('hides progress badge when autoStartReady', () => {
    renderDialog({
      messages: messagesFixture,
      followUpCount: 2,
      followUpLimit: 2,
      autoStartReady: true,
      canStartResearch: true,
    });

    expect(screen.queryByText('Question 2 of 2')).not.toBeInTheDocument();
  });

  it('shows synthesis preview card when preview is provided', () => {
    renderDialog({
      messages: messagesFixture,
      preview: { title: 'AI Market Trends', query: 'Analyze AI market...' },
    });

    expect(screen.getByText('Research Brief')).toBeInTheDocument();
    expect(screen.getByText('AI Market Trends')).toBeInTheDocument();
    expect(screen.getByText('Analyze AI market...')).toBeInTheDocument();
  });

  it('calls onConfirmResearch when confirming preview', async () => {
    const onConfirmResearch = vi.fn();
    const user = userEvent.setup();

    renderDialog({
      messages: messagesFixture,
      preview: { title: 'AI Market Trends', query: 'Analyze AI market...' },
      onConfirmResearch,
    });

    await user.click(screen.getByText('Start Research'));
    expect(onConfirmResearch).toHaveBeenCalled();
  });

  it('calls onDismissPreview when clicking Keep Refining on preview', async () => {
    const onDismissPreview = vi.fn();
    const user = userEvent.setup();

    renderDialog({
      messages: messagesFixture,
      preview: { title: 'AI Market Trends', query: 'Analyze AI market...' },
      onDismissPreview,
    });

    await user.click(screen.getByText('Keep Refining'));
    expect(onDismissPreview).toHaveBeenCalled();
  });

  it('disables input when preview is shown', () => {
    renderDialog({
      messages: messagesFixture,
      preview: { title: 'AI Market Trends', query: 'Analyze AI market...' },
    });

    const input = screen.getByPlaceholderText(
      'Review the brief above, then confirm or keep refining...',
    );
    expect(input).toBeDisabled();
  });

  it('calls onAutoGeneratePodcastChange when checkbox toggled', async () => {
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
