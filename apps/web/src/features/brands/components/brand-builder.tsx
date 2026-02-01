// features/brands/components/brand-builder.tsx
// Brand builder with chat interface and document preview

import {
  PaperPlaneIcon,
  StopIcon,
  ChatBubbleIcon,
  PersonIcon,
  TargetIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { cn } from '@repo/ui/lib/utils';
import { useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import type { RouterOutput } from '@repo/api/client';
import { Markdown } from '../../../components/markdown';
import { useBrandChat } from '../hooks/use-brand-chat';
import { useBrandProgress } from '../hooks/use-brand-progress';
import { useQuickReplies } from '../hooks/use-quick-replies';
import { BrandProgressIndicator } from './brand-progress';
import { QuickReplies } from './quick-replies';

type Brand = RouterOutput['brands']['get'];

interface BrandBuilderProps {
  brand: Brand;
}

/**
 * Brand builder with split view - chat on left, preview on right.
 */
export function BrandBuilder({ brand }: BrandBuilderProps) {
  const hasAutoStartedRef = useRef(false);
  const progress = useBrandProgress(brand);

  const initialMessages = brand.chatMessages.map((msg, index) => ({
    id: `msg_${index}`,
    role: msg.role,
    content: msg.content,
  }));

  const isNewBrand = brand.chatMessages.length === 0;

  const { messages, input, setInput, isLoading, error, sendMessage, stop } =
    useBrandChat({
      brandId: brand.id,
      initialMessages,
    });

  const quickReplies = useQuickReplies(progress, messages);

  // Auto-start conversation for new brands (no existing chat messages)
  useEffect(() => {
    if (isNewBrand && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      // Send initial message to trigger AI greeting
      sendMessage("Let's get started");
    }
  }, [isNewBrand, sendMessage]);

  const handleQuickReply = useCallback(
    (suggestion: string) => {
      sendMessage(suggestion);
    },
    [sendMessage],
  );

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
          quickReplies={quickReplies}
          onQuickReply={handleQuickReply}
        />
      </div>

      {/* Document Preview */}
      <div className="w-1/2 flex flex-col bg-muted/20">
        <DocumentPreview brand={brand} progress={progress} />
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
  quickReplies: string[];
  onQuickReply: (suggestion: string) => void;
}

function ChatPanel({
  messages,
  input,
  setInput,
  isLoading,
  error,
  onSend,
  onStop,
  quickReplies,
  onQuickReply,
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
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-2">
              Starting your brand builder...
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
              {message.role === 'user' ? (
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              ) : (
                <Markdown compact>{message.content}</Markdown>
              )}
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
      <div className="shrink-0 p-4 border-t border-border bg-background space-y-3">
        {/* Quick replies */}
        <QuickReplies
          suggestions={quickReplies}
          onSelect={onQuickReply}
          disabled={isLoading}
        />

        {/* Input area */}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message…"
              rows={1}
              className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-h-32"
              disabled={isLoading}
            />
          </div>
          <div className="flex gap-2">
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
  progress: ReturnType<typeof useBrandProgress>;
}

function DocumentPreview({ brand, progress }: DocumentPreviewProps) {
  return (
    <>
      {/* Preview Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-background/50">
        <h2 className="font-medium">Brand Document</h2>
        <p className="text-sm text-muted-foreground">
          Live preview of your brand profile
        </p>
      </div>

      {/* Progress indicator */}
      <BrandProgressIndicator progress={progress} />

      {/* Preview Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="prose prose-sm max-w-none">
          <h1 className="text-2xl font-bold mb-4">{brand.name}</h1>

          {/* Description */}
          {brand.description ? (
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">About</h2>
              <p className="text-muted-foreground">{brand.description}</p>
            </section>
          ) : (
            <EmptySection
              title="About"
              hint="Tell the AI what your brand does"
              icon={<ChatBubbleIcon className="w-4 h-4" />}
            />
          )}

          {/* Mission */}
          {brand.mission ? (
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">Mission</h2>
              <p className="text-muted-foreground">{brand.mission}</p>
            </section>
          ) : (
            <EmptySection
              title="Mission"
              hint="Share your brand's purpose"
              icon={<TargetIcon className="w-4 h-4" />}
            />
          )}

          {/* Values */}
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

          {/* Colors */}
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

          {/* Brand Guide */}
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

          {/* Personas */}
          {brand.personas.length > 0 ? (
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
          ) : (
            progress.percentage >= 50 && (
              <EmptySection
                title="Personas"
                hint="Create character voices for podcasts"
                icon={<PersonIcon className="w-4 h-4" />}
                highlight
              />
            )
          )}

          {/* Segments */}
          {brand.segments.length > 0 ? (
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
          ) : (
            progress.percentage >= 50 && (
              <EmptySection
                title="Audience Segments"
                hint="Define your target audiences"
                icon={<TargetIcon className="w-4 h-4" />}
                highlight
              />
            )
          )}
        </div>
      </div>
    </>
  );
}

interface EmptySectionProps {
  title: string;
  hint: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}

function EmptySection({ title, hint, icon, highlight }: EmptySectionProps) {
  return (
    <section
      className={cn(
        'mb-6 p-4 rounded-lg border-2 border-dashed',
        highlight
          ? 'border-primary/30 bg-primary/5'
          : 'border-muted-foreground/20 bg-muted/30',
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-muted-foreground/50">{icon}</span>}
        <h2
          className={cn(
            'text-lg font-semibold',
            highlight ? 'text-primary/70' : 'text-muted-foreground/50',
          )}
        >
          {title}
        </h2>
      </div>
      <p className="text-sm text-muted-foreground/70">{hint}</p>
    </section>
  );
}
