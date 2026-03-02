import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';
import { ChatThread } from '@/shared/components/chat-thread';
import { render, screen } from '@/test-utils';

const emptyState = <p>No messages yet</p>;

const assistantMessage = (text: string): UIMessage => ({
  id: 'assistant-1',
  role: 'assistant',
  parts: [{ type: 'text', text }],
});

describe('ChatThread', () => {
  it('renders messages in a chat log region', () => {
    render(
      <ChatThread
        messages={[assistantMessage('Hello there')]}
        isStreaming={false}
        emptyState={emptyState}
      />,
    );

    expect(
      screen.getByRole('log', { name: 'Chat messages' }),
    ).toBeInTheDocument();
  });

  it('announces assistant responses only after streaming completes', () => {
    const message = assistantMessage('Streaming response complete');
    const { rerender } = render(
      <ChatThread messages={[message]} isStreaming emptyState={emptyState} />,
    );

    expect(
      screen.queryByText('Assistant message: Streaming response complete'),
    ).not.toBeInTheDocument();

    rerender(
      <ChatThread
        messages={[message]}
        isStreaming={false}
        emptyState={emptyState}
      />,
    );

    expect(
      screen.getByText('Assistant message: Streaming response complete'),
    ).toBeInTheDocument();
  });

  it('marks chat errors as alert content for screen readers', () => {
    render(
      <ChatThread
        messages={[]}
        isStreaming={false}
        emptyState={emptyState}
        error={new Error('boom')}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.',
    );
  });
});
