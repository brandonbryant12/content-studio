import { describe, it, expect, vi } from 'vitest';
import type { UIMessage } from 'ai';
import { ResearchChatDialog } from '../components/research-chat-dialog';
import { render, screen, userEvent } from '@/test-utils';

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  messages: [] as UIMessage[],
  isStreaming: false,
  error: undefined,
  canStartResearch: false,
  onSendMessage: vi.fn(),
  onStartResearch: vi.fn(),
  isStartingResearch: false,
};

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
    render(<ResearchChatDialog {...defaultProps} />);
    expect(screen.getByText('Deep Research')).toBeInTheDocument();
  });

  it('shows empty state with example topics when no messages', () => {
    render(<ResearchChatDialog {...defaultProps} />);
    expect(
      screen.getByText('What would you like to research? Try one of these:'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('AI trends in healthcare 2026'),
    ).toBeInTheDocument();
  });

  it('displays messages when present', () => {
    render(
      <ResearchChatDialog
        {...defaultProps}
        messages={messagesFixture}
        canStartResearch
      />,
    );
    expect(screen.getByText('AI in healthcare')).toBeInTheDocument();
    expect(
      screen.getByText('What aspect of AI in healthcare interests you?'),
    ).toBeInTheDocument();
  });

  it('calls onSendMessage when submitting input', async () => {
    const onSendMessage = vi.fn();
    const user = userEvent.setup();

    render(
      <ResearchChatDialog {...defaultProps} onSendMessage={onSendMessage} />,
    );

    const input = screen.getByPlaceholderText(
      'Describe your research topic...',
    );
    await user.type(input, 'Test topic');
    await user.keyboard('{Enter}');

    expect(onSendMessage).toHaveBeenCalledWith('Test topic');
  });

  it('clears input after sending', async () => {
    const user = userEvent.setup();

    render(<ResearchChatDialog {...defaultProps} />);

    const input = screen.getByPlaceholderText(
      'Describe your research topic...',
    );
    await user.type(input, 'Test topic');
    await user.keyboard('{Enter}');

    expect(input).toHaveValue('');
  });

  it('disables input while streaming', () => {
    render(<ResearchChatDialog {...defaultProps} isStreaming={true} />);

    const input = screen.getByPlaceholderText(
      'Describe your research topic...',
    );
    expect(input).toBeDisabled();
  });

  it('shows Start Research button when canStartResearch is true', () => {
    render(
      <ResearchChatDialog
        {...defaultProps}
        messages={messagesFixture}
        canStartResearch
      />,
    );

    expect(screen.getByText('Start Research')).toBeInTheDocument();
  });

  it('does not show Start Research button when canStartResearch is false', () => {
    render(
      <ResearchChatDialog
        {...defaultProps}
        messages={messagesFixture}
        canStartResearch={false}
      />,
    );

    expect(screen.queryByText('Start Research')).not.toBeInTheDocument();
  });

  it('calls onStartResearch when clicking Start Research', async () => {
    const onStartResearch = vi.fn();
    const user = userEvent.setup();

    render(
      <ResearchChatDialog
        {...defaultProps}
        messages={messagesFixture}
        canStartResearch
        onStartResearch={onStartResearch}
      />,
    );

    const startButton = screen.getByText('Start Research');
    await user.click(startButton);

    expect(onStartResearch).toHaveBeenCalled();
  });

  it('shows spinner when isStartingResearch', () => {
    render(
      <ResearchChatDialog
        {...defaultProps}
        messages={messagesFixture}
        canStartResearch
        isStartingResearch={true}
      />,
    );

    expect(screen.getByText('Preparing research...')).toBeInTheDocument();
  });

  it('shows error message when error is set', () => {
    render(
      <ResearchChatDialog
        {...defaultProps}
        messages={messagesFixture}
        error={new Error('Stream failed')}
      />,
    );

    expect(
      screen.getByText('Something went wrong. Please try again.'),
    ).toBeInTheDocument();
  });

  it('sends example topic when chip is clicked', async () => {
    const onSendMessage = vi.fn();
    const user = userEvent.setup();

    render(
      <ResearchChatDialog {...defaultProps} onSendMessage={onSendMessage} />,
    );

    await user.click(screen.getByText('AI trends in healthcare 2026'));

    expect(onSendMessage).toHaveBeenCalledWith('AI trends in healthcare 2026');
  });

  it('changes placeholder when research can be started', () => {
    render(
      <ResearchChatDialog
        {...defaultProps}
        messages={messagesFixture}
        canStartResearch
      />,
    );

    expect(
      screen.getByPlaceholderText(
        'Add more details or click Start Research...',
      ),
    ).toBeInTheDocument();
  });
});
