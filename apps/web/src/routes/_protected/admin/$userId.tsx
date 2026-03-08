import { createFileRoute } from '@tanstack/react-router';
import { useNavigate } from '@tanstack/react-router';
import { startTransition, useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { formatProductPageTitle } from '@/constants';
import { AdminUserDetailContainer } from '@/features/admin/components/admin-user-detail-container';
import {
  DEFAULT_ADMIN_ENTITY_LIMIT,
  DEFAULT_ADMIN_USER_ENTITY_LIMIT,
  DEFAULT_ADMIN_USAGE_LIMIT,
  getAdminUserEntitiesQueryOptions,
} from '@/features/admin/hooks';
import {
  ADMIN_USER_ENTITY_TYPES,
  type AdminUserEntityTypeFilter,
} from '@/features/admin/types';
import { SuspenseBoundary } from '@/shared/components/suspense-boundary';

export interface AdminUserDetailSearch {
  readonly entityQuery: string;
  readonly entityType: AdminUserEntityTypeFilter;
  readonly entityPage: number;
}

const parsePositiveInt = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
};

const isEntityTypeFilter = (
  value: unknown,
): value is AdminUserEntityTypeFilter =>
  value === 'all' ||
  ADMIN_USER_ENTITY_TYPES.some((entityType) => entityType === value);

export const Route = createFileRoute('/_protected/admin/$userId')({
  validateSearch: (search): AdminUserDetailSearch => ({
    entityQuery:
      typeof search.entityQuery === 'string' ? search.entityQuery : '',
    entityType: isEntityTypeFilter(search.entityType)
      ? search.entityType
      : 'all',
    entityPage: parsePositiveInt(search.entityPage, 1),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ params, deps }) =>
    Promise.all([
      queryClient.ensureQueryData(
        apiClient.admin.users.get.queryOptions({
          input: {
            userId: params.userId,
            usagePeriod: '30d',
            entityLimit: DEFAULT_ADMIN_ENTITY_LIMIT,
            usageLimit: DEFAULT_ADMIN_USAGE_LIMIT,
          },
        }),
      ),
      queryClient.ensureQueryData(
        getAdminUserEntitiesQueryOptions({
          userId: params.userId,
          query: deps.entityQuery,
          entityType: deps.entityType === 'all' ? undefined : deps.entityType,
          page: deps.entityPage,
          limit: DEFAULT_ADMIN_USER_ENTITY_LIMIT,
        }),
      ),
    ]),
  component: AdminUserDetailRoute,
});

function AdminUserDetailRoute() {
  const { userId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const navigateWithSearch = (
    nextSearch: AdminUserDetailSearch,
    replace = false,
  ) => {
    startTransition(() => {
      void navigate({
        to: '/admin/$userId',
        params: { userId },
        search: nextSearch,
        replace,
      });
    });
  };

  useEffect(() => {
    document.title = formatProductPageTitle('Admin User');
  }, []);

  return (
    <SuspenseBoundary
      resetKeys={[
        userId,
        search.entityQuery,
        search.entityType,
        search.entityPage,
      ]}
    >
      <AdminUserDetailContainer
        userId={userId}
        entityQuery={search.entityQuery}
        entityType={search.entityType}
        entityPage={search.entityPage}
        onEntityQueryChange={(value) =>
          navigateWithSearch(
            {
              entityQuery: value,
              entityType: search.entityType,
              entityPage: 1,
            },
            true,
          )
        }
        onEntityTypeChange={(value) =>
          navigateWithSearch({
            entityQuery: search.entityQuery,
            entityType: value,
            entityPage: 1,
          })
        }
        onEntityPageChange={(page) =>
          navigateWithSearch({
            entityQuery: search.entityQuery,
            entityType: search.entityType,
            entityPage: page,
          })
        }
      />
    </SuspenseBoundary>
  );
}
