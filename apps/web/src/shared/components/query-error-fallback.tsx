import { ErrorFallback } from './error-boundary';
import { getErrorMessage } from '@/shared/lib/errors';

interface QueryErrorFallbackProps {
  error: unknown;
  fallbackMessage: string;
  onRetry: () => void | Promise<unknown>;
}

export function QueryErrorFallback({
  error,
  fallbackMessage,
  onRetry,
}: QueryErrorFallbackProps) {
  const resolvedError =
    error instanceof Error
      ? error
      : new Error(getErrorMessage(error, fallbackMessage));

  return (
    <ErrorFallback
      error={resolvedError}
      resetErrorBoundary={() => {
        void onRetry();
      }}
    />
  );
}
