import type { UIMessage } from 'ai';
import { cn } from '@repo/ui/lib/utils';
import { Markdown } from '@/components/markdown';

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

  if (!text) return null;

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{text}</p>
        ) : (
          <Markdown compact>{text}</Markdown>
        )}
        {isStreaming && !isUser && (
          <span className="inline-block w-1.5 h-4 ml-0.5 bg-foreground/60 animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  );
}
