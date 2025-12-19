import { useCallback } from 'react';
import { invalidateQueries } from '@/clients/query-helpers';

type QueryKeyPrefix = 'podcasts' | 'documents' | 'voices';

export interface UseQueryInvalidationReturn {
  invalidate: (...prefixes: QueryKeyPrefix[]) => Promise<void>;
  invalidatePodcasts: () => Promise<void>;
  invalidateDocuments: () => Promise<void>;
  invalidateVoices: () => Promise<void>;
  invalidateAll: () => Promise<void>;
}

/**
 * Hook for invalidating React Query caches by entity type.
 * Provides convenience methods for common invalidation patterns.
 */
export function useQueryInvalidation(): UseQueryInvalidationReturn {
  const invalidate = useCallback((...prefixes: QueryKeyPrefix[]) => {
    return invalidateQueries(...prefixes);
  }, []);

  const invalidatePodcasts = useCallback(() => {
    return invalidateQueries('podcasts');
  }, []);

  const invalidateDocuments = useCallback(() => {
    return invalidateQueries('documents');
  }, []);

  const invalidateVoices = useCallback(() => {
    return invalidateQueries('voices');
  }, []);

  const invalidateAll = useCallback(() => {
    return invalidateQueries('podcasts', 'documents', 'voices');
  }, []);

  return {
    invalidate,
    invalidatePodcasts,
    invalidateDocuments,
    invalidateVoices,
    invalidateAll,
  };
}
