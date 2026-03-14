import { describe, it, expect } from 'vitest';
import type { UIMessage } from 'ai';
import { ChatMessage } from '@/shared/components/chat-message';
import { CHAT_CONTROL_TOKENS } from '@/shared/lib/chat-control';
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
  it('renders user and assistant text content', () => {
    render(<ChatMessage message={userMessage} isStreaming={false} />);
    expect(screen.getByText('Research AI in healthcare')).toBeInTheDocument();
    render(<ChatMessage message={assistantMessage} isStreaming={false} />);
    expect(
      screen.getByText('Great topic! What aspect interests you?'),
    ).toBeInTheDocument();
  });

  it('strips assistant control tokens and hides token-only messages', () => {
    const controlTokenMessage: UIMessage = {
      id: 'msg-3',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: `Great, starting now ${CHAT_CONTROL_TOKENS.startResearch}`,
        },
      ],
    };

    const { rerender, container } = render(
      <ChatMessage message={controlTokenMessage} isStreaming={false} />,
    );
    expect(screen.getByText('Great, starting now')).toBeInTheDocument();
    expect(
      screen.queryByText(CHAT_CONTROL_TOKENS.startResearch),
    ).not.toBeInTheDocument();

    rerender(
      <ChatMessage
        message={{
          id: 'msg-4',
          role: 'assistant',
          parts: [{ type: 'text', text: CHAT_CONTROL_TOKENS.startResearch }],
        }}
        isStreaming={false}
      />,
    );
    expect(container.firstChild).toBeNull();
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
