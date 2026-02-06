// components/markdown.tsx
// Renders markdown content with proper styling for chat messages

import { memo, lazy, Suspense } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { cn } from '@repo/ui/lib/utils';

const LazyCodeBlock = lazy(() =>
  import('react-syntax-highlighter/dist/esm/prism-light').then(
    async (mod) => {
      const { default: oneDark } = await import(
        'react-syntax-highlighter/dist/esm/styles/prism/one-dark'
      );
      const SyntaxHighlighter = mod.default;
      return {
        default: function CodeBlock({
          language,
          children,
          compact,
        }: {
          language: string;
          children: string;
          compact: boolean;
        }) {
          return (
            <SyntaxHighlighter
              style={oneDark}
              language={language}
              PreTag="div"
              customStyle={{
                margin: 0,
                padding: compact ? '0.75rem' : '1rem',
                background: '#1e1e1e',
                fontSize: 'inherit',
              }}
            >
              {children}
            </SyntaxHighlighter>
          );
        },
      };
    },
  ),
);

interface MarkdownProps {
  children: string;
  className?: string;
  /** Compact mode for chat bubbles (smaller text, tighter spacing) */
  compact?: boolean;
}

/**
 * Renders markdown content with syntax highlighting and proper styling.
 * Uses react-markdown with custom components for Tailwind styling.
 */
export const Markdown = memo(function Markdown({
  children,
  className,
  compact = false,
}: MarkdownProps) {
  const components: Components = {
    // Headings
    h1: ({ children, ...props }) => (
      <h1
        className={cn(
          'font-serif font-semibold text-foreground',
          compact ? 'text-lg mt-3 mb-1.5' : 'text-2xl mt-6 mb-3',
        )}
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2
        className={cn(
          'font-serif font-semibold text-foreground',
          compact ? 'text-base mt-2.5 mb-1' : 'text-xl mt-5 mb-2',
        )}
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3
        className={cn(
          'font-serif font-medium text-foreground',
          compact ? 'text-sm mt-2 mb-1' : 'text-lg mt-4 mb-2',
        )}
        {...props}
      >
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4
        className={cn(
          'font-medium text-foreground',
          compact ? 'text-sm mt-2 mb-0.5' : 'text-base mt-3 mb-1',
        )}
        {...props}
      >
        {children}
      </h4>
    ),

    // Paragraphs
    p: ({ children, ...props }) => (
      <p
        className={cn(
          'leading-relaxed',
          compact ? 'mb-2 last:mb-0' : 'mb-3 last:mb-0',
        )}
        {...props}
      >
        {children}
      </p>
    ),

    // Lists
    ul: ({ children, ...props }) => (
      <ul
        className={cn(
          'list-disc list-outside',
          compact ? 'pl-4 mb-2 space-y-0.5' : 'pl-5 mb-3 space-y-1',
        )}
        {...props}
      >
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol
        className={cn(
          'list-decimal list-outside',
          compact ? 'pl-4 mb-2 space-y-0.5' : 'pl-5 mb-3 space-y-1',
        )}
        {...props}
      >
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="leading-relaxed" {...props}>
        {children}
      </li>
    ),

    // Inline elements
    strong: ({ children, ...props }) => (
      <strong className="font-semibold text-foreground" {...props}>
        {children}
      </strong>
    ),
    em: ({ children, ...props }) => (
      <em className="italic" {...props}>
        {children}
      </em>
    ),
    a: ({ children, href, ...props }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        {...props}
      >
        {children}
      </a>
    ),

    // Code blocks
    code: ({ className: codeClassName, children, ...props }) => {
      const match = /language-(\w+)/.exec(codeClassName || '');
      const isInline = !match;

      if (isInline) {
        return (
          <code
            className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-[0.9em]"
            {...props}
          >
            {children}
          </code>
        );
      }

      const language = match[1]!;
      const codeString = String(children).replace(/\n$/, '');

      return (
        <div
          className={cn(
            'my-2 rounded-lg overflow-hidden',
            compact ? 'text-xs' : 'text-sm',
          )}
        >
          {language && (
            <div className="px-3 py-1.5 bg-zinc-800 text-zinc-400 text-xs font-mono border-b border-zinc-700">
              {language}
            </div>
          )}
          <Suspense
            fallback={
              <pre
                style={{
                  margin: 0,
                  padding: compact ? '0.75rem' : '1rem',
                  background: '#1e1e1e',
                  fontSize: 'inherit',
                  color: '#abb2bf',
                  overflow: 'auto',
                }}
              >
                <code>{codeString}</code>
              </pre>
            }
          >
            <LazyCodeBlock language={language} compact={compact}>
              {codeString}
            </LazyCodeBlock>
          </Suspense>
        </div>
      );
    },

    // Block elements
    blockquote: ({ children, ...props }) => (
      <blockquote
        className={cn(
          'border-l-4 border-primary/40 pl-4 italic text-muted-foreground',
          compact ? 'my-2' : 'my-4',
        )}
        {...props}
      >
        {children}
      </blockquote>
    ),
    hr: ({ ...props }) => (
      <hr
        className={cn('border-border', compact ? 'my-3' : 'my-6')}
        {...props}
      />
    ),

    // Tables
    table: ({ children, ...props }) => (
      <div className={cn('overflow-x-auto', compact ? 'my-2' : 'my-4')}>
        <table className="min-w-full border-collapse text-sm" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }) => (
      <thead className="bg-muted/50" {...props}>
        {children}
      </thead>
    ),
    tbody: ({ children, ...props }) => (
      <tbody className="divide-y divide-border" {...props}>
        {children}
      </tbody>
    ),
    tr: ({ children, ...props }) => <tr {...props}>{children}</tr>,
    th: ({ children, ...props }) => (
      <th
        className="px-3 py-2 text-left font-medium text-foreground border-b border-border"
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className="px-3 py-2 text-muted-foreground" {...props}>
        {children}
      </td>
    ),
  };

  return (
    <div
      className={cn(
        'markdown-content',
        compact ? 'text-sm' : 'text-base',
        className,
      )}
    >
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </div>
  );
});

export type { MarkdownProps };
