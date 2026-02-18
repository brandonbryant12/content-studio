import { QueryClient } from '@tanstack/react-query';

interface ApiLikeError {
  code: string;
}

const isApiLikeError = (error: unknown): error is ApiLikeError => {
  if (typeof error !== 'object' || error === null) return false;
  return typeof (error as { code?: unknown }).code === 'string';
};

const isNotFoundErrorCode = (code: string): boolean =>
  code === 'NOT_FOUND' || code.endsWith('_NOT_FOUND');

const shouldRetryQuery = (failureCount: number, error: unknown): boolean => {
  if (isApiLikeError(error) && isNotFoundErrorCode(error.code)) {
    return false;
  }

  return failureCount < 3;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is fresh for 1 minute - prevents unnecessary refetches
      staleTime: 1000 * 60,
      // Keep unused data in cache for 5 minutes
      gcTime: 1000 * 60 * 5,
      // Don't retry known not-found responses.
      retry: shouldRetryQuery,
    },
  },
});
