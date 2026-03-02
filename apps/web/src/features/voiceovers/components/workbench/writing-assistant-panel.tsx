import { ChatBubbleIcon, PaperPlaneIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Textarea } from '@repo/ui/components/textarea';
import { useCallback, useMemo, useState } from 'react';
import type { UIMessage } from 'ai';
import { ChatThread } from '@/shared/components/chat-thread';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { useChatComposer } from '@/shared/hooks/use-chat-composer';
import {
  getMessageText,
  stripChatControlTokens,
} from '@/shared/lib/chat-control';
import {
  CHAT_INPUT_MAX_LENGTH,
  CHAT_INPUT_TEXTAREA_CLASS,
} from '@/shared/lib/chat-input';

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
  onAppendToManuscript: (text: string) => void;
  onReplaceManuscript: (text: string) => void;
}

export function WritingAssistantPanel({
  messages,
  isStreaming,
  error,
  onSendMessage,
  onReset,
  onAppendToManuscript,
  onReplaceManuscript,
}: WritingAssistantPanelProps) {
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const composer = useChatComposer({
    isDisabled: isStreaming,
    onSendMessage,
  });

  const latestAssistantText = useMemo(() => {
    const latestAssistantMessage = [...messages]
      .reverse()
      .find((message) => message.role === 'assistant');

    if (!latestAssistantMessage) return '';
    return stripChatControlTokens(getMessageText(latestAssistantMessage)).trim();
  }, [messages]);

  const canApplyLatestResponse =
    latestAssistantText.length > 0 && !isStreaming;

  const handleExampleClick = useCallback(
    (prompt: string) => {
      if (isStreaming) return;
      onSendMessage(prompt);
    },
    [isStreaming, onSendMessage],
  );

  const handleAppendToManuscript = useCallback(() => {
    if (!canApplyLatestResponse) return;
    onAppendToManuscript(latestAssistantText);
  }, [canApplyLatestResponse, latestAssistantText, onAppendToManuscript]);

  const handleRequestReplace = useCallback(() => {
    if (!canApplyLatestResponse) return;
    setReplaceConfirmOpen(true);
  }, [canApplyLatestResponse]);

  const handleConfirmReplace = useCallback(() => {
    onReplaceManuscript(latestAssistantText);
    setReplaceConfirmOpen(false);
  }, [latestAssistantText, onReplaceManuscript]);

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

      <ChatThread
        messages={messages}
        isStreaming={isStreaming}
        error={error}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3"
        emptyState={
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
        }
      />

      {latestAssistantText && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Apply latest assistant response to manuscript:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!canApplyLatestResponse}
              onClick={handleAppendToManuscript}
            >
              Append to Manuscript
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canApplyLatestResponse}
              onClick={handleRequestReplace}
            >
              Replace Manuscript
            </Button>
          </div>
        </div>
      )}

      <form
        onSubmit={composer.handleSubmit}
        className="border-t border-border p-3 flex items-end gap-2"
      >
        <Textarea
          value={composer.input}
          onChange={(e) => composer.setInput(e.target.value)}
          onKeyDown={composer.handleInputKeyDown}
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
          disabled={!composer.canSubmit}
          className="shrink-0"
          aria-label="Send message"
        >
          <PaperPlaneIcon className="w-4 h-4" />
        </Button>
      </form>

      <ConfirmationDialog
        open={replaceConfirmOpen}
        onOpenChange={setReplaceConfirmOpen}
        title="Replace manuscript?"
        description="This will overwrite your current manuscript text with the latest assistant response."
        confirmText="Replace manuscript"
        variant="destructive"
        onConfirm={handleConfirmReplace}
      />
    </section>
  );
}
