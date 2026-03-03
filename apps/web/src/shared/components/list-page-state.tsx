import { Spinner } from '@repo/ui/components/spinner';
import type { ReactNode } from 'react';
import { QueryErrorFallback } from './query-error-fallback';

interface ListPageStateShellProps {
  title: string;
  containerClassName?: string;
  children: ReactNode;
}

function ListPageStateShell({
  title,
  containerClassName = 'page-container-narrow',
  children,
}: ListPageStateShellProps) {
  return (
    <div className={containerClassName}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="page-eyebrow">{title}</p>
          <h1 className="page-title">{title}</h1>
        </div>
      </div>
      {children}
    </div>
  );
}

interface ListPageLoadingStateProps {
  title: string;
  containerClassName?: string;
}

export function ListPageLoadingState({
  title,
  containerClassName,
}: ListPageLoadingStateProps) {
  return (
    <ListPageStateShell title={title} containerClassName={containerClassName}>
      <div className="loading-center-lg">
        <Spinner size="lg" />
      </div>
    </ListPageStateShell>
  );
}

interface ListPageErrorStateProps {
  title: string;
  error: unknown;
  fallbackMessage: string;
  onRetry: () => void | Promise<unknown>;
  containerClassName?: string;
}

export function ListPageErrorState({
  title,
  error,
  fallbackMessage,
  onRetry,
  containerClassName,
}: ListPageErrorStateProps) {
  return (
    <ListPageStateShell title={title} containerClassName={containerClassName}>
      <QueryErrorFallback
        error={error}
        fallbackMessage={fallbackMessage}
        onRetry={onRetry}
      />
    </ListPageStateShell>
  );
}
