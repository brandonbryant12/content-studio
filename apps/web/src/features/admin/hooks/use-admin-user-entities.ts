import {
  useSuspenseQuery,
  type QueryKey,
  type UseSuspenseQueryResult,
} from '@tanstack/react-query';
import type { AdminUserEntitiesResult, AdminUserEntityType } from '../types';
import { DEFAULT_ADMIN_USER_ENTITY_LIMIT } from '../types';
import { apiClient } from '@/clients/apiClient';

export { DEFAULT_ADMIN_USER_ENTITY_LIMIT } from '../types';

interface AdminUserEntitiesOptions {
  readonly userId: string;
  readonly query?: string;
  readonly entityType?: AdminUserEntityType;
  readonly page?: number;
  readonly limit?: number;
}

const normalizeQuery = (query?: string): string | undefined => {
  const normalized = query?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
};

const getOffset = (page: number, limit: number) =>
  Math.max(page - 1, 0) * limit;

export function getAdminUserEntitiesQueryOptions({
  userId,
  query,
  entityType,
  page = 1,
  limit = DEFAULT_ADMIN_USER_ENTITY_LIMIT,
}: AdminUserEntitiesOptions) {
  return apiClient.admin.users.entities.queryOptions({
    input: {
      userId,
      query: normalizeQuery(query),
      entityType,
      limit,
      offset: getOffset(page, limit),
    },
  });
}

export function getAdminUserEntitiesQueryKey(
  options: AdminUserEntitiesOptions,
): QueryKey {
  return getAdminUserEntitiesQueryOptions(options).queryKey;
}

export function useAdminUserEntities(
  options: AdminUserEntitiesOptions,
): UseSuspenseQueryResult<AdminUserEntitiesResult, Error> {
  return useSuspenseQuery(getAdminUserEntitiesQueryOptions(options));
}
