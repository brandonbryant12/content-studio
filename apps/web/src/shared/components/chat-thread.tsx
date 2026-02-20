import { useEffect, useRef, type ReactNode } from 'react';
import type { UIMessage } from 'ai';
import { ChatMessage } from './chat-message';
import { isStreamingAssistantMessage } from '@/shared/lib/chat-streaming';

interface ChatThreadProps {
  messages: readonly UIMessage[];
  isStreaming: boolean;
  emptyState: ReactNode;
  error?: Error;
  errorMessage?: string;
  className?: string;
}

export function ChatThread({
  messages,
  isStreaming,
  emptyState,
  error,
  errorMessage = 'Something went wrong. Please try again.',
  className,
}: ChatThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView !== 'function') return;
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={className}>
      {messages.length === 0
        ? emptyState
        : messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              isStreaming={isStreamingAssistantMessage(
                messages,
                message,
                index,
                isStreaming,
              )}
            />
          ))}

      {error && (
        <div className="flex justify-center">
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {errorMessage}
          </p>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
