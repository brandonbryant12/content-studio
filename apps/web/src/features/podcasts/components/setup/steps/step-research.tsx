import { CheckCircledIcon, PaperPlaneIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Textarea } from '@repo/ui/components/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import {
  getDocumentListQueryKey,
  useResearchChat,
  useSynthesizeResearch,
} from '@/features/documents/hooks';
import { ChatAutoTriggerConfirmation } from '@/shared/components/chat-auto-trigger-confirmation';
import { ChatProgressBadge } from '@/shared/components/chat-progress-badge';
import { ChatThread } from '@/shared/components/chat-thread';
import { useChatComposer } from '@/shared/hooks/use-chat-composer';
import {
  CHAT_INPUT_MAX_LENGTH,
  CHAT_INPUT_TEXTAREA_CLASS,
} from '@/shared/lib/chat-input';
import { getErrorMessage } from '@/shared/lib/errors';

interface StepResearchProps {
  onDocumentCreated: (documentId: string, title: string) => void;
  createdDocumentId: string | null;
}

const EXAMPLE_TOPICS = [
  'AI in Healthcare',
  'Climate Technology',
  'Space Exploration',
  'Quantum Computing',
];

export function StepResearch({
  onDocumentCreated,
  createdDocumentId,
}: StepResearchProps) {
  const queryClient = useQueryClient();
  const {
    messages,
    sendMessage,
    isStreaming,
    error,
    canStartResearch,
    shouldAutoStart,
    followUpCount,
    followUpLimit,
    extendFollowUps,
  } = useResearchChat();
  const synthesize = useSynthesizeResearch();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const startResearchMutation = useMutation(
    apiClient.documents.fromResearch.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: getDocumentListQueryKey(),
        });
        onDocumentCreated(data.id, data.title);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to start research'));
      },
    }),
  );

  // Auto-focus input on mount
  useEffect(() => {
    if (!createdDocumentId) {
      inputRef.current?.focus();
    }
  }, [createdDocumentId]);

  const isStarting = synthesize.isPending || startResearchMutation.isPending;
  const startError =
    synthesize.error ?? startResearchMutation.error ?? undefined;
  const isInputDisabled = isStreaming || isStarting;
  const composer = useChatComposer({
    isDisabled: isInputDisabled,
    onSendMessage: (text) => {
      sendMessage({ text });
    },
  });

  const handleTopicClick = useCallback(
    (topic: string) => {
      sendMessage({ text: `I want to research: ${topic}` });
    },
    [sendMessage],
  );

  const handleStartResearch = useCallback(() => {
    if (messages.length === 0 || isStarting) return;

    synthesize.mutate(messages, {
      onSuccess: ({ query, title }) => {
        startResearchMutation.mutate({ query, title });
      },
    });
  }, [messages, isStarting, synthesize, startResearchMutation]);

  // Complete state — research document created
  if (createdDocumentId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div
          className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400"
          role="status"
          aria-live="polite"
        >
          <CheckCircledIcon className="w-5 h-5" />
          <span>Research started successfully</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Your research document has been added to the selection.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Progress badge */}
      {followUpCount > 0 && !shouldAutoStart && (
        <div className="flex justify-center">
          <ChatProgressBadge current={followUpCount} total={followUpLimit} />
        </div>
      )}

      <ChatThread
        messages={messages}
        isStreaming={isStreaming}
        error={error}
        className={
          messages.length > 0
            ? 'flex flex-col space-y-3 max-h-[320px] overflow-y-auto px-1'
            : undefined
        }
        emptyState={
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-sm text-muted-foreground">
              Describe a topic to research for your podcast
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLE_TOPICS.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => handleTopicClick(topic)}
                  className="px-3 py-1.5 text-xs rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {canStartResearch && (
        <div>
          {shouldAutoStart ? (
            <ChatAutoTriggerConfirmation
              actionLabel="Start Research"
              isPending={isStarting}
              pendingLabel="Preparing research..."
              error={startError}
              onConfirm={handleStartResearch}
              onKeepRefining={extendFollowUps}
            />
          ) : (
            <div className="space-y-2">
              {startError && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-center">
                  Failed to start research. Please try again.
                </p>
              )}
              <div className="flex justify-center">
                <Button
                  onClick={handleStartResearch}
                  size="sm"
                  disabled={isStarting}
                >
                  {isStarting ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      Preparing research...
                    </>
                  ) : startError ? (
                    'Retry'
                  ) : (
                    'Start Research'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={composer.handleSubmit} className="relative">
        <Textarea
          ref={inputRef}
          value={composer.input}
          onChange={(e) => composer.setInput(e.target.value)}
          onKeyDown={composer.handleInputKeyDown}
          placeholder={
            canStartResearch
              ? 'Add more details or click Start Research...'
              : 'Describe your research topic...'
          }
          disabled={isInputDisabled}
          maxLength={CHAT_INPUT_MAX_LENGTH}
          rows={1}
          className={`setup-textarea pr-12 ${CHAT_INPUT_TEXTAREA_CLASS}`}
          aria-label="Research topic"
        />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          disabled={!composer.canSubmit}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 text-muted-foreground hover:text-foreground"
        >
          <PaperPlaneIcon className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
