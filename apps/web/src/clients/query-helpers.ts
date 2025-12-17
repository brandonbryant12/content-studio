import type { Query } from '@tanstack/react-query';
import { queryClient } from './queryClient';

type QueryKeyPrefix = 'podcasts' | 'documents' | 'projects' | 'voices';

/**
 * Creates a predicate function for invalidating oRPC query keys.
 * oRPC uses path arrays like ['podcasts', 'list'] as the first element of query keys.
 */
export function createQueryKeyPredicate(...prefixes: QueryKeyPrefix[]) {
  return (query: Query): boolean => {
    const key = query.queryKey;
    if (!Array.isArray(key) || key.length === 0) return false;

    const firstKey = key[0];
    if (Array.isArray(firstKey)) {
      return prefixes.includes(firstKey[0] as QueryKeyPrefix);
    }
    return prefixes.includes(firstKey as QueryKeyPrefix);
  };
}

/**
 * Invalidate all queries matching the given prefixes.
 */
export function invalidateQueries(...prefixes: QueryKeyPrefix[]) {
  return queryClient.invalidateQueries({
    predicate: createQueryKeyPredicate(...prefixes),
  });
}
