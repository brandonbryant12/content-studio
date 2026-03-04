import { describe, it, expect } from 'vitest';
import type { UIMessage } from 'ai';
import { ChatMessage } from '@/shared/components/chat-message';
import { render, screen } from '@/test-utils';

const userMessage: UIMessage = {
  id: 'msg-1',
  role: 'user',
  parts: [{ type: 'text', text: 'Research AI in healthcare' }],
};

const assistantMessage: UIMessage = {
  id: 'msg-2',
  role: 'assistant',
  parts: [{ type: 'text', text: 'Great topic! What aspect interests you?' }],
};

describe('ChatMessage', () => {
  it('renders user message text', () => {
    render(<ChatMessage message={userMessage} isStreaming={false} />);
    expect(screen.getByText('Research AI in healthcare')).toBeInTheDocument();
  });

  it('renders assistant message text', () => {
    render(<ChatMessage message={assistantMessage} isStreaming={false} />);
    expect(
      screen.getByText('Great topic! What aspect interests you?'),
    ).toBeInTheDocument();
  });

  it('applies primary styling to user messages', () => {
    const { container } = render(
      <ChatMessage message={userMessage} isStreaming={false} />,
    );
    const bubble = container.querySelector('.bg-primary');
    expect(bubble).toBeInTheDocument();
  });

  it('applies wrapping classes to user text', () => {
    const { container } = render(
      <ChatMessage message={userMessage} isStreaming={false} />,
    );
    const text = container.querySelector('p');
    expect(text).toHaveClass('break-words');
  });

  it('applies muted styling to assistant messages', () => {
    const { container } = render(
      <ChatMessage message={assistantMessage} isStreaming={false} />,
    );
    const bubble = container.querySelector('.bg-muted');
    expect(bubble).toBeInTheDocument();
  });

  it.each([
    {
      name: 'shows streaming cursor for assistant message when streaming',
      message: assistantMessage,
      isStreaming: true,
      shouldRenderCursor: true,
    },
    {
      name: 'does not show streaming cursor when not streaming',
      message: assistantMessage,
      isStreaming: false,
      shouldRenderCursor: false,
    },
    {
      name: 'does not show streaming cursor for user messages even when streaming',
      message: userMessage,
      isStreaming: true,
      shouldRenderCursor: false,
    },
  ])('$name', ({ message, isStreaming, shouldRenderCursor }) => {
    const { container } = render(
      <ChatMessage message={message} isStreaming={isStreaming} />,
    );
    const cursor = container.querySelector('.animate-pulse');
    if (shouldRenderCursor) {
      expect(cursor).toBeInTheDocument();
    } else {
      expect(cursor).not.toBeInTheDocument();
    }
  });
});
