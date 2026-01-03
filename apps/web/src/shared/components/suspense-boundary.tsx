import { Suspense, type ReactNode } from 'react';
import { Spinner } from '@repo/ui/components/spinner';
import { ErrorBoundary } from './error-boundary';
import type { ErrorFallbackProps } from './error-boundary';

interface SuspenseBoundaryProps {
  children: ReactNode;
  /** Keys that trigger reset when changed (e.g., route params) */
  resetKeys?: unknown[];
  /** Custom suspense fallback (defaults to centered spinner) */
  fallback?: ReactNode;
  /** Custom error fallback component */
  FallbackComponent?: React.ComponentType<ErrorFallbackProps>;
  /** Called when error boundary is reset */
  onReset?: () => void;
}

function DefaultFallback() {
  return (
    <div
      className="flex items-center justify-center h-full min-h-[200px]"
      data-testid="loading-spinner"
    >
      <Spinner className="w-6 h-6" />
    </div>
  );
}

export function SuspenseBoundary({
  children,
  resetKeys,
  fallback,
  FallbackComponent,
  onReset,
}: SuspenseBoundaryProps) {
  return (
    <ErrorBoundary
      resetKeys={resetKeys}
      FallbackComponent={FallbackComponent}
      onReset={onReset}
    >
      <Suspense fallback={fallback ?? <DefaultFallback />}>{children}</Suspense>
    </ErrorBoundary>
  );
}
