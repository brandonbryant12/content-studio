import { MagnifyingGlassIcon, PaperPlaneIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { UIMessage } from 'ai';
import { ChatMessage } from './chat-message';

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
}: ResearchChatDialogProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
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
        <div className="flex-1 overflow-y-auto px-6 space-y-3 min-h-0">
          {messages.length === 0 ? (
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
          ) : (
            <>
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isStreaming={
                    isStreaming &&
                    message.role === 'assistant' &&
                    index === messages.length - 1
                  }
                />
              ))}
            </>
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

        {/* Start Research button */}
        {canStartResearch && (
          <div className="border-t px-6 py-3 space-y-2">
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
        <form onSubmit={handleSubmit} className="border-t px-6 py-4 flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              autoStartReady && !startError
                ? 'Research is starting automatically...'
                : canStartResearch
                  ? 'Add more details or click Start Research...'
                  : 'Describe your research topic...'
            }
            disabled={isStreaming || isStartingResearch}
            autoFocus
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isStreaming || isStartingResearch}
          >
            <PaperPlaneIcon className="w-4 h-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
