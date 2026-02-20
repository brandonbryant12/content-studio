import { MagnifyingGlassIcon, PaperPlaneIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Checkbox } from '@repo/ui/components/checkbox';
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
import { ChatThread } from '@/shared/components/chat-thread';
import { useChatComposer } from '@/shared/hooks/use-chat-composer';
import {
  CHAT_INPUT_MAX_LENGTH,
  CHAT_INPUT_TEXTAREA_CLASS,
} from '@/shared/lib/chat-input';

const EXAMPLE_TOPICS = [
  'AI trends in healthcare 2026',
  'Sustainable energy storage solutions',
  'Remote work productivity research',
];

interface ResearchChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: UIMessage[];
  isStreaming: boolean;
  error: Error | undefined;
  canStartResearch: boolean;
  autoStartReady: boolean;
  startError: Error | undefined;
  onSendMessage: (text: string) => void;
  onStartResearch: () => void;
  isStartingResearch: boolean;
  autoGeneratePodcast: boolean;
  onAutoGeneratePodcastChange: (value: boolean) => void;
}

export function ResearchChatDialog({
  open,
  onOpenChange,
  messages,
  isStreaming,
  error,
  canStartResearch,
  autoStartReady,
  startError,
  onSendMessage,
  onStartResearch,
  isStartingResearch,
  autoGeneratePodcast,
  onAutoGeneratePodcastChange,
}: ResearchChatDialogProps) {
  const isInputDisabled = isStreaming || isStartingResearch;
  const composer = useChatComposer({
    isDisabled: isInputDisabled,
    onSendMessage,
  });

  const handleExampleClick = useCallback(
    (topic: string) => {
      onSendMessage(topic);
    },
    [onSendMessage],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 flex flex-col h-[70vh] max-h-[700px]">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <MagnifyingGlassIcon className="w-5 h-5" />
            Deep Research
          </DialogTitle>
          <DialogDescription>
            Describe your research topic and I&apos;ll help refine it for the
            best results.
          </DialogDescription>
        </DialogHeader>

        {/* Messages area */}
        <ChatThread
          messages={messages}
          isStreaming={isStreaming}
          error={error}
          className="flex-1 overflow-y-auto px-6 space-y-3 min-h-0"
          emptyState={
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <p className="text-sm text-muted-foreground">
                What would you like to research? Try one of these:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {EXAMPLE_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => handleExampleClick(topic)}
                    className="px-3 py-1.5 text-xs rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          }
        />

        <div className="border-t px-6 py-3">
          <label className="flex items-start gap-3">
            <Checkbox
              checked={autoGeneratePodcast}
              onCheckedChange={(checked) =>
                onAutoGeneratePodcastChange(checked === true)
              }
              disabled={isStartingResearch}
              aria-label="Auto-generate podcast from findings"
            />
            <span className="text-sm leading-5">
              Auto-generate podcast from findings
              <span className="block text-xs text-muted-foreground">
                Uses defaults: 5 min, no custom instructions, Aoede + Charon.
              </span>
            </span>
          </label>
        </div>

        {/* Start Research button */}
        {canStartResearch && (
          <div className="px-6 pb-3 space-y-2">
            {startError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-center">
                Failed to start research. Please try again.
              </p>
            )}
            <Button
              onClick={onStartResearch}
              disabled={isStartingResearch || (autoStartReady && !startError)}
              className="w-full"
            >
              {isStartingResearch ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Preparing research...
                </>
              ) : startError ? (
                'Retry'
              ) : autoStartReady ? (
                'Starting automatically...'
              ) : (
                'Start Research'
              )}
            </Button>
          </div>
        )}

        {/* Input bar */}
        <form
          onSubmit={composer.handleSubmit}
          className="border-t px-6 py-4 flex items-end gap-2"
        >
          <Textarea
            value={composer.input}
            onChange={(e) => composer.setInput(e.target.value)}
            onKeyDown={composer.handleInputKeyDown}
            placeholder={
              autoStartReady && !startError
                ? 'Research is starting automatically...'
                : canStartResearch
                  ? 'Add more details or click Start Research...'
                  : 'Describe your research topic...'
            }
            disabled={isInputDisabled}
            maxLength={CHAT_INPUT_MAX_LENGTH}
            rows={1}
            className={CHAT_INPUT_TEXTAREA_CLASS}
            autoFocus
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
      </DialogContent>
    </Dialog>
  );
}
