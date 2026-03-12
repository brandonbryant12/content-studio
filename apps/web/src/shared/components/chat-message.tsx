import { cn } from '@repo/ui/lib/utils';
import type { UIMessage } from 'ai';
import { Markdown } from '@/components/markdown';
import { stripChatControlTokens } from '@/shared/lib/chat-control';

interface ChatMessageProps {
  message: UIMessage;
  isStreaming: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';

  const text = message.parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text)
    .join('');

  const displayText = isUser ? text : stripChatControlTokens(text);

  if (!displayText) return null;

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] min-w-0 rounded-2xl px-5 py-3',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap break-words">
            {displayText}
          </p>
        ) : (
          <Markdown compact className="break-words">
            {displayText}
          </Markdown>
        )}
        {isStreaming && !isUser && (
          <span className="inline-block w-1.5 h-4 ml-0.5 bg-foreground/60 animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  );
}
