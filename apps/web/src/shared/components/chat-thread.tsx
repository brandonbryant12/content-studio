import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { UIMessage } from 'ai';
import { ChatMessage } from './chat-message';
import {
  getMessageText,
  stripChatControlTokens,
} from '@/shared/lib/chat-control';
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

  const latestAssistantMessage = useMemo(
    () =>
      [...messages].reverse().find((message) => message.role === 'assistant'),
    [messages],
  );
  const latestAssistantText = latestAssistantMessage
    ? stripChatControlTokens(getMessageText(latestAssistantMessage)).trim()
    : '';
  const liveAnnouncement =
    !isStreaming && latestAssistantText.length > 0
      ? `Assistant message: ${latestAssistantText}`
      : '';

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView !== 'function') return;
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div
      className={className}
      role="log"
      aria-label="Chat messages"
      aria-relevant="additions text"
    >
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
          <p
            role="alert"
            className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2"
          >
            {errorMessage}
          </p>
        </div>
      )}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </p>
      <div ref={messagesEndRef} />
    </div>
  );
}
