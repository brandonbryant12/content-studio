import { describe, expect, it, vi } from 'vitest';
import { getActivityListQueryKey } from '../use-activity-list';
import { apiClient } from '@/clients/apiClient';

vi.mock('@/env', () => ({
  env: {
    PUBLIC_SERVER_URL: 'http://localhost:3035',
    PUBLIC_SERVER_API_PATH: '/api',
    PUBLIC_BASE_PATH: '/',
  },
}));

describe('getActivityListQueryKey', () => {
  it('derives the cache key from api query options and includes limit', () => {
    const queryKey = getActivityListQueryKey({
      userId: 'user-1',
      entityType: 'document',
      search: 'report',
      limit: 10,
    });

    expect(queryKey).toEqual(
      apiClient.admin.list.queryOptions({
        input: {
          userId: 'user-1',
          entityType: 'document',
          search: 'report',
          limit: 10,
        },
      }).queryKey,
    );
  });

  it('normalizes blank and whitespace search terms', () => {
    expect(
      getActivityListQueryKey({
        search: '   ',
      }),
    ).toEqual(
      apiClient.admin.list.queryOptions({
        input: {
          search: undefined,
          limit: 50,
        },
      }).queryKey,
    );

    expect(
      getActivityListQueryKey({
        search: '  hello world  ',
      }),
    ).toEqual(
      apiClient.admin.list.queryOptions({
        input: {
          search: 'hello world',
          limit: 50,
        },
      }).queryKey,
    );
  });
});
