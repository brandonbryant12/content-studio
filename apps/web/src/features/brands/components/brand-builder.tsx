// features/brands/components/brand-builder.tsx
// Brand builder with chat interface and document preview

import { useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { PaperPlaneIcon, StopIcon, TrackNextIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { cn } from '@repo/ui/lib/utils';
import type { RouterOutput } from '@repo/api/client';
import { useBrandChat } from '../hooks/use-brand-chat';

type Brand = RouterOutput['brands']['get'];

interface BrandBuilderProps {
  brand: Brand;
}

/**
 * Brand builder with split view - chat on left, preview on right.
 */
export function BrandBuilder({ brand }: BrandBuilderProps) {
  const initialMessages = brand.chatMessages.map((msg, index) => ({
    id: `msg_${index}`,
    role: msg.role,
    content: msg.content,
  }));

  const { messages, input, setInput, isLoading, error, sendMessage, stop } =
    useBrandChat({
      brandId: brand.id,
      initialMessages,
    });

  return (
    <div className="h-full flex">
      {/* Chat Panel */}
      <div className="w-1/2 flex flex-col border-r border-border">
        <ChatPanel
          messages={messages}
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          error={error}
          onSend={sendMessage}
          onStop={stop}
          brandName={brand.name}
        />
      </div>

      {/* Document Preview */}
      <div className="w-1/2 flex flex-col bg-muted/20">
        <DocumentPreview brand={brand} />
      </div>
    </div>
  );
}

interface ChatPanelProps {
  messages: Array<{ id: string; role: 'user' | 'assistant'; content: string }>;
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  error: Error | null;
  onSend: (content?: string) => Promise<void>;
  onStop: () => void;
  brandName: string;
}

function ChatPanel({
  messages,
  input,
  setInput,
  isLoading,
  error,
  onSend,
  onStop,
  brandName,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    },
    [onSend],
  );

  const handleSkip = useCallback(() => {
    onSend("Let's skip this for now and move on to the next topic.");
  }, [onSend]);

  return (
    <>
      {/* Chat Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-background">
        <h2 className="font-medium">Brand Builder</h2>
        <p className="text-sm text-muted-foreground">
          Chat with AI to build your brand profile
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-2">
              Welcome to the brand builder for <strong>{brandName}</strong>!
            </p>
            <p className="text-sm text-muted-foreground">
              Start the conversation to define your brand's identity.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex',
              message.role === 'user' ? 'justify-end' : 'justify-start',
            )}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-2',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted',
              )}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Spinner className="w-4 h-4" />
                <span className="text-sm text-muted-foreground">
                  Thinking...
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-2">
              <p className="text-sm">{error.message}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 p-4 border-t border-border bg-background">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={1}
              className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-h-32"
              disabled={isLoading}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleSkip}
              disabled={isLoading}
              title="Skip this question"
            >
              <TrackNextIcon className="w-4 h-4" />
            </Button>
            {isLoading ? (
              <Button variant="destructive" size="icon" onClick={onStop}>
                <StopIcon className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={() => onSend()}
                disabled={!input.trim()}
              >
                <PaperPlaneIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

interface DocumentPreviewProps {
  brand: Brand;
}

function DocumentPreview({ brand }: DocumentPreviewProps) {
  return (
    <>
      {/* Preview Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-background/50">
        <h2 className="font-medium">Brand Document</h2>
        <p className="text-sm text-muted-foreground">
          Live preview of your brand profile
        </p>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="prose prose-sm max-w-none">
          <h1 className="text-2xl font-bold mb-4">{brand.name}</h1>

          {brand.description && (
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">About</h2>
              <p className="text-muted-foreground">{brand.description}</p>
            </section>
          )}

          {brand.mission && (
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">Mission</h2>
              <p className="text-muted-foreground">{brand.mission}</p>
            </section>
          )}

          {brand.values.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Core Values
              </h2>
              <ul className="list-disc list-inside text-muted-foreground">
                {brand.values.map((value, i) => (
                  <li key={i}>{value}</li>
                ))}
              </ul>
            </section>
          )}

          {brand.colors && (
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Brand Colors
              </h2>
              <div className="flex gap-3 mt-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: brand.colors.primary }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {brand.colors.primary}
                  </span>
                </div>
                {brand.colors.secondary && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: brand.colors.secondary }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {brand.colors.secondary}
                    </span>
                  </div>
                )}
                {brand.colors.accent && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: brand.colors.accent }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {brand.colors.accent}
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          {brand.brandGuide && (
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Brand Guidelines
              </h2>
              <div className="text-muted-foreground whitespace-pre-wrap">
                {brand.brandGuide}
              </div>
            </section>
          )}

          {brand.personas.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Personas
              </h2>
              {brand.personas.map((persona) => (
                <div
                  key={persona.id}
                  className="mt-3 p-3 rounded-lg bg-muted/50"
                >
                  <h3 className="font-medium">
                    {persona.name}{' '}
                    <span className="font-normal text-muted-foreground">
                      — {persona.role}
                    </span>
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {persona.personalityDescription}
                  </p>
                </div>
              ))}
            </section>
          )}

          {brand.segments.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Target Segments
              </h2>
              {brand.segments.map((segment) => (
                <div
                  key={segment.id}
                  className="mt-3 p-3 rounded-lg bg-muted/50"
                >
                  <h3 className="font-medium">{segment.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {segment.description}
                  </p>
                </div>
              ))}
            </section>
          )}

          {/* Empty state */}
          {!brand.description &&
            !brand.mission &&
            brand.values.length === 0 &&
            !brand.colors &&
            !brand.brandGuide &&
            brand.personas.length === 0 &&
            brand.segments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Start chatting to build your brand profile.</p>
                <p className="text-sm mt-2">
                  The AI will help you define your brand's identity, values, and
                  voice.
                </p>
              </div>
            )}
        </div>
      </div>
    </>
  );
}
