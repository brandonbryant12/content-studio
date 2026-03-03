import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import type { ReactNode } from 'react';
import { getGenerationFailureMessage } from '@/shared/lib/errors';

interface SearchMatch {
  paragraphIndex: number;
  start: number;
  length: number;
}

export interface ParagraphMatch extends SearchMatch {
  globalIndex: number;
}

export function buildMatchesByParagraph(
  matches: readonly SearchMatch[],
): Map<number, ParagraphMatch[]> {
  const grouped = new Map<number, ParagraphMatch[]>();
  matches.forEach((match, globalIndex) => {
    const list = grouped.get(match.paragraphIndex);
    const withGlobalIndex = { ...match, globalIndex };
    if (list) {
      list.push(withGlobalIndex);
    } else {
      grouped.set(match.paragraphIndex, [withGlobalIndex]);
    }
  });
  return grouped;
}

function highlightParagraph(
  text: string,
  paragraphMatches: readonly ParagraphMatch[] | undefined,
  currentMatchIndex: number,
): ReactNode[] {
  if (!paragraphMatches || paragraphMatches.length === 0) return [text];

  const fragments: ReactNode[] = [];
  let cursor = 0;

  for (const match of paragraphMatches) {
    if (match.start > cursor) {
      fragments.push(text.slice(cursor, match.start));
    }
    const isCurrent = match.globalIndex === currentMatchIndex;
    fragments.push(
      <mark
        key={`${match.globalIndex}-${match.start}-${match.length}`}
        className={
          isCurrent
            ? 'bg-primary/30 text-foreground rounded-sm ring-2 ring-primary'
            : 'bg-yellow-200/60 dark:bg-yellow-500/30 text-foreground rounded-sm'
        }
        data-search-current={isCurrent ? 'true' : undefined}
      >
        {text.slice(match.start, match.start + match.length)}
      </mark>,
    );
    cursor = match.start + match.length;
  }

  if (cursor < text.length) {
    fragments.push(text.slice(cursor));
  }

  return fragments;
}

interface DocumentContentReaderProps {
  content: string | null;
  paragraphs: string[];
  queryLength: number;
  matchCount: number;
  currentMatchIndex: number;
  matchesByParagraph: Map<number, ParagraphMatch[]>;
}

export function DocumentContentReader({
  content,
  paragraphs,
  queryLength,
  matchCount,
  currentMatchIndex,
  matchesByParagraph,
}: DocumentContentReaderProps) {
  return (
    <article className="document-content-reader">
      {content ? (
        paragraphs.map((paragraph, i) =>
          paragraph.trim() === '' ? (
            <br key={i} />
          ) : (
            <p key={i}>
              {queryLength >= 2 && matchCount > 0
                ? highlightParagraph(
                    paragraph,
                    matchesByParagraph.get(i),
                    currentMatchIndex,
                  )
                : paragraph}
            </p>
          ),
        )
      ) : (
        <p className="text-muted-foreground italic">
          No content available for this document.
        </p>
      )}
    </article>
  );
}

export function DocumentProcessingState({ source }: { source: string }) {
  const statusText =
    source === 'research'
      ? 'Document research is in progress and may take a few minutes'
      : 'Document processing is in progress';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="flex flex-col items-center justify-center py-20 gap-4"
    >
      <Spinner className="w-8 h-8" />
      <p className="text-muted-foreground text-sm">{statusText}</p>
    </div>
  );
}

interface DocumentFailedStateProps {
  errorMessage: string | null;
  onRetry: () => void;
  isRetrying: boolean;
}

export function DocumentFailedState({
  errorMessage,
  onRetry,
  isRetrying,
}: DocumentFailedStateProps) {
  const failureMessage = getGenerationFailureMessage(
    errorMessage,
    'Processing failed. Please retry.',
  );
  const statusText = isRetrying
    ? 'Retrying document processing'
    : (failureMessage ?? 'Processing failed');

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="flex flex-col items-center justify-center py-20 gap-4"
    >
      <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
        <svg
          className="w-6 h-6 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>
      <p className="text-muted-foreground text-sm text-center max-w-md">
        {statusText}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={isRetrying}
      >
        {isRetrying ? (
          <>
            <Spinner className="w-3.5 h-3.5 mr-2" />
            Retrying...
          </>
        ) : (
          'Retry'
        )}
      </Button>
    </div>
  );
}
