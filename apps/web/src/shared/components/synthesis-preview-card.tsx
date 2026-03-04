import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import type { ReactNode } from 'react';

export interface ResearchSynthesisPreview {
  query: string;
  title: string;
}

export interface PersonaSynthesisPreview {
  name: string;
  role: string;
  personalityDescription: string;
  speakingStyle: string;
  exampleQuotes: readonly string[];
  voiceId: string;
  voiceName: string;
}

interface SynthesisPreviewCardProps {
  title: string;
  children: ReactNode;
  actionLabel: string;
  isPending: boolean;
  pendingLabel: string;
  onConfirm: () => void;
  onKeepRefining: () => void;
}

export function SynthesisPreviewCard({
  title,
  children,
  actionLabel,
  isPending,
  pendingLabel,
  onConfirm,
  onKeepRefining,
}: SynthesisPreviewCardProps) {
  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-border bg-accent/30 p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>

      {children}

      <div className="flex gap-2 pt-1">
        <Button
          onClick={onConfirm}
          disabled={isPending}
          size="sm"
          className="flex-1"
        >
          {isPending ? (
            <>
              <Spinner className="w-3.5 h-3.5 mr-1.5" />
              {pendingLabel}
            </>
          ) : (
            actionLabel
          )}
        </Button>
        <Button
          onClick={onKeepRefining}
          disabled={isPending}
          variant="ghost"
          size="sm"
        >
          Keep Refining
        </Button>
      </div>
    </div>
  );
}

interface ResearchPreviewContentProps {
  title: string;
  query: string;
}

export function ResearchPreviewContent({
  title,
  query,
}: ResearchPreviewContentProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-foreground">{title}</h4>
      <p className="text-sm text-muted-foreground leading-relaxed">{query}</p>
    </div>
  );
}

interface PersonaPreviewContentProps {
  name: string;
  role: string;
  personalityDescription: string;
  speakingStyle: string;
  exampleQuotes: readonly string[];
  voiceName: string;
}

export function PersonaPreviewContent({
  name,
  role,
  personalityDescription,
  speakingStyle,
  exampleQuotes,
  voiceName,
}: PersonaPreviewContentProps) {
  return (
    <div className="space-y-2 text-sm">
      <div>
        <span className="font-medium text-foreground">{name}</span>
        <span className="text-muted-foreground"> — {role}</span>
      </div>
      <p className="text-muted-foreground leading-relaxed">
        {personalityDescription}
      </p>
      <div className="text-muted-foreground">
        <span className="font-medium text-foreground/80">Style:</span>{' '}
        {speakingStyle}
      </div>
      {exampleQuotes.length > 0 && (
        <div className="space-y-1">
          <span className="font-medium text-foreground/80">
            Example quotes:
          </span>
          <ul className="list-none space-y-1">
            {exampleQuotes.slice(0, 2).map((quote, i) => (
              <li
                key={i}
                className="text-muted-foreground italic pl-2 border-l-2 border-border"
              >
                &ldquo;{quote}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="text-muted-foreground">
        <span className="font-medium text-foreground/80">Voice:</span>{' '}
        {voiceName}
      </div>
    </div>
  );
}
