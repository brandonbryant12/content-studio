import { ChatBubbleIcon, PaperPlaneIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Textarea } from '@repo/ui/components/textarea';
import { useCallback } from 'react';
import type { UIMessage } from 'ai';
import { ChatThread } from '@/shared/components/chat-thread';
import { useChatComposer } from '@/shared/hooks/use-chat-composer';
import {
  CHAT_INPUT_MAX_LENGTH,
  CHAT_INPUT_TEXTAREA_CLASS,
} from '@/shared/lib/chat-input';

const EXAMPLE_PROMPTS = [
  'Create a clean circular logo for a coffee brand.',
  'Make it monochrome and suitable for print.',
  'Turn this into a playful mascot badge style.',
];

interface SvgChatPanelProps {
  messages: UIMessage[];
  status: string;
  error: Error | undefined;
  onSendMessage: (text: string) => void;
}

export function SvgChatPanel({
  messages,
  status,
  error,
  onSendMessage,
}: SvgChatPanelProps) {
  const isStreaming = status === 'submitted' || status === 'streaming';
  const composer = useChatComposer({
    isDisabled: isStreaming,
    onSendMessage,
  });

  const handleExampleClick = useCallback(
    (prompt: string) => {
      if (isStreaming) return;
      onSendMessage(prompt);
    },
    [isStreaming, onSendMessage],
  );

  return (
    <section className="h-full flex flex-col bg-card/40">
      <header className="border-b border-border px-4 py-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ChatBubbleIcon className="w-4 h-4 text-primary" />
          SVG Chat
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Describe edits in plain language and the assistant will regenerate the
          full SVG.
        </p>
      </header>

      <ChatThread
        messages={messages}
        isStreaming={isStreaming}
        error={error}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3"
        emptyState={
          <div className="h-full flex flex-col items-center justify-center text-center gap-4">
            <p className="text-sm text-muted-foreground">
              Ask for a fresh concept or iterate on style, layout, and color.
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
        }
      />

      <form
        onSubmit={composer.handleSubmit}
        className="border-t border-border p-3 flex items-end gap-2"
      >
        <Textarea
          value={composer.input}
          onChange={(event) => composer.setInput(event.target.value)}
          onKeyDown={composer.handleInputKeyDown}
          placeholder="Describe what you want to create or change..."
          disabled={isStreaming}
          maxLength={CHAT_INPUT_MAX_LENGTH}
          rows={1}
          className={CHAT_INPUT_TEXTAREA_CLASS}
          aria-label="SVG chat input"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!composer.canSubmit}
          className="shrink-0"
        >
          <PaperPlaneIcon className="w-4 h-4" />
        </Button>
      </form>
    </section>
  );
}
