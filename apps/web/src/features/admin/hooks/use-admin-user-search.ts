import { useQuery, type QueryKey } from '@tanstack/react-query';
import { apiClient } from '@/clients/apiClient';

export const DEFAULT_ADMIN_USER_SEARCH_LIMIT = 20;

const normalizeQuery = (query?: string): string | undefined => {
  const normalized = query?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
};

export function getAdminUserSearchQueryKey(
  query?: string,
  limit = DEFAULT_ADMIN_USER_SEARCH_LIMIT,
): QueryKey {
  return apiClient.admin.users.search.queryOptions({
    input: {
      query: normalizeQuery(query),
      limit,
    },
  }).queryKey;
}

export function useAdminUserSearch(
  query?: string,
  limit = DEFAULT_ADMIN_USER_SEARCH_LIMIT,
) {
  return useQuery(
    apiClient.admin.users.search.queryOptions({
      input: {
        query: normalizeQuery(query),
        limit,
      },
    }),
  );
}
