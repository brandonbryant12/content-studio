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
import { useCallback, useMemo } from 'react';
import type { UIMessage } from 'ai';
import { ChatAutoTriggerConfirmation } from '@/shared/components/chat-auto-trigger-confirmation';
import { ChatProgressBadge } from '@/shared/components/chat-progress-badge';
import { ChatThread } from '@/shared/components/chat-thread';
import { useChatComposer } from '@/shared/hooks/use-chat-composer';
import {
  CHAT_INPUT_MAX_LENGTH,
  CHAT_INPUT_TEXTAREA_CLASS,
} from '@/shared/lib/chat-input';
import {
  PERSONA_CHAT_DESCRIPTION,
  PERSONA_CHAT_PROMPT_INTRO,
} from '@/shared/lib/persona-guidance';

const EXAMPLE_PROMPTS = [
  'A weekly cybersecurity host for IT leaders who explains threats without jargon',
  'A client-specific manufacturing advisor focused on safety, uptime, and frontline credibility',
  'A warm storytelling host for nonprofit donor updates',
  'A no-nonsense CFO guide for SaaS founders',
  'A sharp healthcare policy analyst for hospital executives',
  'A calm HR leader helping managers navigate hard conversations',
  'A practical retail operator translating data into store-level action',
  'A founder-friendly legal explainer who reduces compliance anxiety',
  'A community bank voice that speaks plainly to small business owners',
  'A franchise growth coach obsessed with consistency and margin',
  'A sustainability lead balancing operational realism with ambition',
  'A procurement expert who thinks in risk, leverage, and supplier trust',
];

function pickRandom<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

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
  title?: string;
  description?: string;
  promptIntro?: string;
  confirmActionLabel?: string;
  pendingActionLabel?: string;
  errorMessage?: string;
  followUpPlaceholder?: string;
  initialPlaceholder?: string;
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
  title = 'Create Persona',
  description = PERSONA_CHAT_DESCRIPTION,
  promptIntro = PERSONA_CHAT_PROMPT_INTRO,
  confirmActionLabel = 'Create Persona',
  pendingActionLabel = 'Creating persona...',
  errorMessage = 'Failed to create persona. Please try again.',
  followUpPlaceholder = 'Add more details or click Create Persona...',
  initialPlaceholder = 'Describe your persona idea...',
}: PersonaChatDialogProps) {
  const suggestions = useMemo(() => pickRandom(EXAMPLE_PROMPTS, 3), []);
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
      <DialogContent className="sm:max-w-3xl p-0 flex flex-col h-[90vh] max-h-[1000px]">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <PersonIcon className="w-5 h-5" />
            {title}
            {followUpCount > 0 && !autoCreateReady && (
              <ChatProgressBadge
                current={followUpCount}
                total={followUpLimit}
              />
            )}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ChatThread
          messages={messages}
          isStreaming={isStreaming}
          error={error}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0"
          emptyState={
            <div className="flex flex-col items-center justify-center h-full text-center gap-5">
              <p className="text-sm text-muted-foreground max-w-md">
                {promptIntro}
              </p>
              <div className="flex flex-wrap gap-2.5 justify-center max-w-lg">
                {suggestions.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleExampleClick(prompt)}
                    className="px-3.5 py-2 text-sm rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                actionLabel={confirmActionLabel}
                isPending={isCreatingPersona}
                pendingLabel={pendingActionLabel}
                error={createError}
                onConfirm={onCreatePersona}
                onKeepRefining={onKeepRefining}
              />
            ) : (
              <div className="space-y-2">
                {createError && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-center">
                    {errorMessage}
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
                      {pendingActionLabel}
                    </>
                  ) : createError ? (
                    'Retry'
                  ) : (
                    confirmActionLabel
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
              canCreatePersona ? followUpPlaceholder : initialPlaceholder
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
