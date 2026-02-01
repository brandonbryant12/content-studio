// features/brands/components/brand-wizard/ai-assistant-panel.tsx
// Simplified AI chat panel for use within wizard steps

import { PaperPlaneIcon, StopIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';
import {
  memo,
  useCallback,
  useRef,
  useEffect,
  type KeyboardEvent,
} from 'react';
import { Markdown } from '../../../../components/markdown';
import { useBrandChat } from '../../hooks/use-brand-chat';

interface QuickAction {
  label: string;
  prompt: string;
}

interface AIAssistantPanelProps {
  /** Brand ID for chat context */
  brandId: string;
  /** Step key for context (e.g., 'colors', 'values') */
  stepKey: string;
  /** Quick action buttons to display */
  quickActions?: QuickAction[];
  /** Callback when AI provides a suggestion (extracted from response) */
  onSuggestion?: (suggestion: unknown) => void;
  /** Optional className for container */
  className?: string;
}

/**
 * Simplified AI chat interface for wizard steps.
 * Shows chat messages, input field, and quick action buttons.
 */
export const AIAssistantPanel = memo(function AIAssistantPanel({
  brandId,
  stepKey,
  quickActions = [],
  onSuggestion: _onSuggestion,
  className,
}: AIAssistantPanelProps) {
  const chat = useBrandChat({
    brandId,
    stepKey,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages]);

  const handleSubmit = useCallback(async () => {
    if (!chat.input.trim() || chat.isLoading) return;
    await chat.sendMessage();
  }, [chat]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleQuickAction = useCallback(
    async (prompt: string) => {
      if (chat.isLoading) return;
      await chat.sendMessage(prompt);
    },
    [chat],
  );

  return (
    <div
      className={cn(
        'flex flex-col h-full rounded-xl border bg-card',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-sm font-medium text-foreground">
          AI Assistant
        </span>
        <span className="text-xs text-muted-foreground">({stepKey})</span>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {chat.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-sm text-muted-foreground">
              Ask me anything about your brand, or use a quick action below.
            </p>
          </div>
        ) : (
          chat.messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start',
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-xl px-4 py-2.5',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground',
                )}
              >
                {message.role === 'user' ? (
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {message.content}
                  </p>
                ) : (
                  <Markdown compact>{message.content}</Markdown>
                )}
              </div>
            </div>
          ))
        )}
        {chat.isLoading &&
          chat.messages[chat.messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    Thinking
                  </span>
                  <span className="flex gap-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground/50 animate-pulse" />
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground/50 animate-pulse [animation-delay:200ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground/50 animate-pulse [animation-delay:400ms]" />
                  </span>
                </div>
              </div>
            </div>
          )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-3">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction(action.prompt)}
              disabled={chat.isLoading}
              className="text-xs"
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 pt-0">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={chat.input}
            onChange={(e) => chat.setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for suggestions…"
            autoComplete="off"
            disabled={chat.isLoading}
            rows={2}
            className={cn(
              'w-full resize-none rounded-xl border bg-background px-4 py-3 pr-12 text-sm',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          />
          <div className="absolute right-2 bottom-2">
            {chat.isLoading ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={chat.stop}
                className="h-8 w-8"
                aria-label="Stop"
              >
                <StopIcon className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSubmit}
                disabled={!chat.input.trim()}
                className="h-8 w-8"
                aria-label="Send"
              >
                <PaperPlaneIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {chat.error && (
          <p className="mt-2 text-xs text-destructive">{chat.error.message}</p>
        )}
      </div>
    </div>
  );
});

export type { QuickAction, AIAssistantPanelProps };
