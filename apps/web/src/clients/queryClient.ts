import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorMessage } from '@/shared/lib/errors';

interface ApiLikeError {
  code: string;
  data?: {
    retryAfter?: number;
  };
}

const isApiLikeError = (error: unknown): error is ApiLikeError => {
  if (typeof error !== 'object' || error === null) return false;
  return typeof (error as { code?: unknown }).code === 'string';
};

const isNotFoundErrorCode = (code: string): boolean =>
  code === 'NOT_FOUND' || code.endsWith('_NOT_FOUND');

const shouldRetryQuery = (failureCount: number, error: unknown): boolean => {
  if (isApiLikeError(error)) {
    if (isNotFoundErrorCode(error.code)) return false;
    if (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN')
      return false;
  }

  return failureCount < 3;
};

const defaultRetryDelay = (attempt: number): number =>
  Math.min(1000 * 2 ** attempt, 30_000);

const retryDelay = (attempt: number, error: unknown): number => {
  if (isApiLikeError(error) && error.code === 'RATE_LIMITED') {
    const retryAfterMs = error.data?.retryAfter;
    if (typeof retryAfterMs === 'number' && retryAfterMs > 0) {
      return retryAfterMs;
    }
  }

  return defaultRetryDelay(attempt);
};

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.options.onError) {
        return;
      }

      toast.error(getErrorMessage(error, 'Operation failed'));
    },
  }),
  defaultOptions: {
    queries: {
      // Data is fresh for 1 minute - prevents unnecessary refetches
      staleTime: 1000 * 60,
      // Keep unused data in cache for 5 minutes
      gcTime: 1000 * 60 * 5,
      // Don't retry known not-found or auth responses.
      retry: shouldRetryQuery,
      retryDelay,
    },
  },
});
