import {
  useSuspenseQuery,
  type QueryKey,
  type UseSuspenseQueryResult,
} from '@tanstack/react-query';
import type { AIUsagePeriod, AdminUserDetail } from '../types';
import { apiClient } from '@/clients/apiClient';

export const DEFAULT_ADMIN_ENTITY_LIMIT = 6;
export const DEFAULT_ADMIN_USAGE_LIMIT = 25;

interface UseAdminUserDetailOptions {
  readonly userId: string;
  readonly usagePeriod?: AIUsagePeriod;
  readonly entityLimit?: number;
  readonly usageLimit?: number;
}

export function getAdminUserDetailQueryKey(
  userId: string,
  usagePeriod: AIUsagePeriod = '30d',
  entityLimit = DEFAULT_ADMIN_ENTITY_LIMIT,
  usageLimit = DEFAULT_ADMIN_USAGE_LIMIT,
): QueryKey {
  return apiClient.admin.users.get.queryOptions({
    input: {
      userId,
      usagePeriod,
      entityLimit,
      usageLimit,
    },
  }).queryKey;
}

export function useAdminUserDetail({
  userId,
  usagePeriod = '30d',
  entityLimit = DEFAULT_ADMIN_ENTITY_LIMIT,
  usageLimit = DEFAULT_ADMIN_USAGE_LIMIT,
}: UseAdminUserDetailOptions): UseSuspenseQueryResult<AdminUserDetail, Error> {
  return useSuspenseQuery(
    apiClient.admin.users.get.queryOptions({
      input: {
        userId,
        usagePeriod,
        entityLimit,
        usageLimit,
      },
    }),
  );
}
