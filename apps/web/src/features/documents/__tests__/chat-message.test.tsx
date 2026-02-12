import { describe, it, expect } from 'vitest';
import type { UIMessage } from 'ai';
import { ChatMessage } from '../components/chat-message';
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

  it('applies muted styling to assistant messages', () => {
    const { container } = render(
      <ChatMessage message={assistantMessage} isStreaming={false} />,
    );
    const bubble = container.querySelector('.bg-muted');
    expect(bubble).toBeInTheDocument();
  });

  it('shows streaming cursor for assistant message when streaming', () => {
    const { container } = render(
      <ChatMessage message={assistantMessage} isStreaming={true} />,
    );
    const cursor = container.querySelector('.animate-pulse');
    expect(cursor).toBeInTheDocument();
  });

  it('does not show streaming cursor when not streaming', () => {
    const { container } = render(
      <ChatMessage message={assistantMessage} isStreaming={false} />,
    );
    const cursor = container.querySelector('.animate-pulse');
    expect(cursor).not.toBeInTheDocument();
  });

  it('does not show streaming cursor for user messages even when streaming', () => {
    const { container } = render(
      <ChatMessage message={userMessage} isStreaming={true} />,
    );
    const cursor = container.querySelector('.animate-pulse');
    expect(cursor).not.toBeInTheDocument();
  });
});
