import { CheckCircledIcon, PaperPlaneIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { ChatMessage } from '@/features/documents/components/chat-message';
import { getDocumentListQueryKey } from '@/features/documents/hooks/use-document-list';
import { useResearchChat } from '@/features/documents/hooks/use-research-chat';
import { useSynthesizeResearch } from '@/features/documents/hooks/use-synthesize-research';
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
  const { messages, sendMessage, isStreaming, canStartResearch } =
    useResearchChat();
  const synthesize = useSynthesizeResearch();
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-focus input on mount
  useEffect(() => {
    if (!createdDocumentId) {
      inputRef.current?.focus();
    }
  }, [createdDocumentId]);

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    setInputValue('');
    sendMessage({ text });
  }, [inputValue, isStreaming, sendMessage]);

  const handleTopicClick = useCallback(
    (topic: string) => {
      sendMessage({ text: `I want to research: ${topic}` });
    },
    [sendMessage],
  );

  const handleStartResearch = useCallback(async () => {
    const result = await synthesize.mutateAsync(messages);
    startResearchMutation.mutate({
      query: result.query,
      title: result.title,
    });
  }, [messages, synthesize, startResearchMutation]);

  const isStarting = synthesize.isPending || startResearchMutation.isPending;

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
      {/* Messages area */}
      {messages.length > 0 ? (
        <div
          ref={scrollRef}
          className="flex flex-col gap-3 max-h-[320px] overflow-y-auto p-1"
        >
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isStreaming={
                isStreaming &&
                msg === messages[messages.length - 1] &&
                msg.role === 'assistant'
              }
            />
          ))}
        </div>
      ) : (
        /* Empty state with example topics */
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
                className="px-3 py-1.5 text-xs rounded-full border border-border hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Start Research button */}
      {canStartResearch && !isStarting && (
        <div className="flex justify-center">
          <Button onClick={handleStartResearch} size="sm">
            Start Research
          </Button>
        </div>
      )}

      {/* Starting state */}
      {isStarting && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Spinner className="w-4 h-4" />
          <span className="text-sm text-muted-foreground">
            Preparing research…
          </span>
        </div>
      )}

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="relative"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Describe your research topic..."
          disabled={isStreaming || isStarting}
          className="setup-input pr-12"
          aria-label="Research topic"
        />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          disabled={!inputValue.trim() || isStreaming || isStarting}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 text-muted-foreground hover:text-foreground"
        >
          <PaperPlaneIcon className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
