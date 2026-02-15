import { PersonIcon, PaperPlaneIcon } from '@radix-ui/react-icons';
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
import { ChatMessage } from '@/shared/components/chat-message';

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
  synthesizeError: Error | undefined;
  canCreatePersona: boolean;
  onSendMessage: (text: string) => void;
  onCreatePersona: () => void;
  isCreatingPersona: boolean;
}

export function PersonaChatDialog({
  open,
  onOpenChange,
  messages,
  isStreaming,
  error,
  synthesizeError,
  canCreatePersona,
  onSendMessage,
  onCreatePersona,
  isCreatingPersona,
}: PersonaChatDialogProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
          </DialogTitle>
          <DialogDescription>
            Describe your persona and I&apos;ll help define their character,
            voice, and style.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 space-y-3 min-h-0">
          {messages.length === 0 ? (
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
                    className="px-3 py-1.5 text-xs rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {prompt}
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

        {canCreatePersona && (
          <div className="border-t px-6 py-3 space-y-2">
            {synthesizeError && (
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
              ) : synthesizeError ? (
                'Retry'
              ) : (
                'Create Persona'
              )}
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="border-t px-6 py-4 flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              canCreatePersona
                ? 'Add more details or click Create Persona...'
                : 'Describe your persona idea...'
            }
            disabled={isStreaming || isCreatingPersona}
            autoFocus
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isStreaming || isCreatingPersona}
          >
            <PaperPlaneIcon className="w-4 h-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
