import { PersonIcon, PaperPlaneIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Spinner } from '@repo/ui/components/spinner';
import { Textarea } from '@repo/ui/components/textarea';
import { useCallback } from 'react';
import type { UIMessage } from 'ai';
import { ChatAutoTriggerConfirmation } from '@/shared/components/chat-auto-trigger-confirmation';
import { ChatProgressBadge } from '@/shared/components/chat-progress-badge';
import { ChatThread } from '@/shared/components/chat-thread';
import { useChatComposer } from '@/shared/hooks/use-chat-composer';
import {
  CHAT_INPUT_MAX_LENGTH,
  CHAT_INPUT_TEXTAREA_CLASS,
} from '@/shared/lib/chat-input';

const EXAMPLE_PROMPTS = [
  'A witty science communicator',
  'A no-nonsense tech analyst',
  'A warm storytelling host',
];

interface PersonaChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: UIMessage[];
  isStreaming: boolean;
  error: Error | undefined;
  createError: Error | undefined;
  canCreatePersona: boolean;
  autoCreateReady: boolean;
  onSendMessage: (text: string) => void;
  onCreatePersona: () => void;
  isCreatingPersona: boolean;
  followUpCount: number;
  followUpLimit: number;
  onKeepRefining: () => void;
}

export function PersonaChatDialog({
  open,
  onOpenChange,
  messages,
  isStreaming,
  error,
  createError,
  canCreatePersona,
  autoCreateReady,
  onSendMessage,
  onCreatePersona,
  isCreatingPersona,
  followUpCount,
  followUpLimit,
  onKeepRefining,
}: PersonaChatDialogProps) {
  const isInputDisabled = isStreaming || isCreatingPersona;
  const composer = useChatComposer({
    isDisabled: isInputDisabled,
    onSendMessage,
  });

  const handleExampleClick = useCallback(
    (prompt: string) => {
      onSendMessage(prompt);
    },
    [onSendMessage],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 flex flex-col h-[70vh] max-h-[700px]">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <PersonIcon className="w-5 h-5" />
            Create Persona
            {followUpCount > 0 && !autoCreateReady && (
              <ChatProgressBadge
                current={followUpCount}
                total={followUpLimit}
              />
            )}
          </DialogTitle>
          <DialogDescription>
            Describe your persona and I&apos;ll help define their character,
            voice, and style.
          </DialogDescription>
        </DialogHeader>

        <ChatThread
          messages={messages}
          isStreaming={isStreaming}
          error={error}
          className="flex-1 overflow-y-auto px-6 space-y-3 min-h-0"
          emptyState={
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <p className="text-sm text-muted-foreground">
                What kind of persona would you like to create? Try one of these:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleExampleClick(prompt)}
                    className="px-3 py-1.5 text-xs rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          }
        />

        {canCreatePersona && (
          <div className="border-t px-6 py-3">
            {autoCreateReady ? (
              <ChatAutoTriggerConfirmation
                actionLabel="Create Persona"
                isPending={isCreatingPersona}
                pendingLabel="Creating persona..."
                error={createError}
                onConfirm={onCreatePersona}
                onKeepRefining={onKeepRefining}
              />
            ) : (
              <div className="space-y-2">
                {createError && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-center">
                    Failed to create persona. Please try again.
                  </p>
                )}
                <Button
                  onClick={onCreatePersona}
                  disabled={isCreatingPersona}
                  className="w-full"
                >
                  {isCreatingPersona ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      Creating persona...
                    </>
                  ) : createError ? (
                    'Retry'
                  ) : (
                    'Create Persona'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        <form
          onSubmit={composer.handleSubmit}
          className="border-t px-6 py-4 flex items-end gap-2"
        >
          <Textarea
            value={composer.input}
            onChange={(e) => composer.setInput(e.target.value)}
            onKeyDown={composer.handleInputKeyDown}
            placeholder={
              canCreatePersona
                ? 'Add more details or click Create Persona...'
                : 'Describe your persona idea...'
            }
            disabled={isInputDisabled}
            maxLength={CHAT_INPUT_MAX_LENGTH}
            rows={1}
            className={CHAT_INPUT_TEXTAREA_CLASS}
            aria-label="Persona description"
            autoFocus
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
      </DialogContent>
    </Dialog>
  );
}
