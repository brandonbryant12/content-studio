import { ChatBubbleIcon, PaperPlaneIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Textarea } from '@repo/ui/components/textarea';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { UIMessage } from 'ai';
import {
  CHAT_INPUT_MAX_LENGTH,
  CHAT_INPUT_TEXTAREA_CLASS,
} from '@/shared/lib/chat-input';
import { ChatMessage } from '@/shared/components/chat-message';

const EXAMPLE_PROMPTS = [
  'Give me three stronger opening lines for this narration.',
  'Rewrite this paragraph to sound more cinematic but concise.',
  'Tighten this script so it fits a 45-second read.',
];

interface WritingAssistantPanelProps {
  messages: UIMessage[];
  isStreaming: boolean;
  error: Error | undefined;
  onSendMessage: (text: string) => void;
  onReset: () => void;
}

export function WritingAssistantPanel({
  messages,
  isStreaming,
  error,
  onSendMessage,
  onReset,
}: WritingAssistantPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isStreaming) return;
      onSendMessage(trimmed);
      setInput('');
    },
    [input, isStreaming, onSendMessage],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.currentTarget.form?.requestSubmit();
      }
    },
    [],
  );

  const handleExampleClick = useCallback(
    (prompt: string) => {
      if (isStreaming) return;
      onSendMessage(prompt);
    },
    [isStreaming, onSendMessage],
  );

  return (
    <section className="flex flex-1 min-h-[420px] lg:min-h-0 flex-col bg-card/40">
      <header className="border-b border-border px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <ChatBubbleIcon className="w-4 h-4 text-primary" />
              Writing Assistant
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Refine wording, pacing, and tone so your narration lands.
            </p>
          </div>
          {messages.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              disabled={isStreaming}
            >
              Clear
            </Button>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          This chat is temporary and is not saved.
        </p>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4">
            <p className="text-sm text-muted-foreground">
              Ask for rewrites, better hooks, or smoother transitions.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleExampleClick(prompt)}
                  disabled={isStreaming}
                  className="px-3 py-1.5 text-xs rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              isStreaming={
                isStreaming &&
                message.role === 'assistant' &&
                index === messages.length - 1
              }
            />
          ))
        )}

        {error && (
          <div className="flex justify-center">
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              Something went wrong. Please try again.
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-border p-3 flex items-end gap-2"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Ask for a rewrite, stronger hook, or tone shift..."
          disabled={isStreaming}
          maxLength={CHAT_INPUT_MAX_LENGTH}
          rows={1}
          className={CHAT_INPUT_TEXTAREA_CLASS}
          aria-label="Writing assistant input"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isStreaming}
          className="shrink-0"
        >
          <PaperPlaneIcon className="w-4 h-4" />
        </Button>
      </form>
    </section>
  );
}
