import { useState } from 'react';
import type { AIUsagePeriod, AdminUserEntityTypeFilter } from '../types';
import { useAdminUserDetail, useAdminUserEntities } from '../hooks';
import { AdminUserDetailPage } from './admin-user-detail-page';

interface AdminUserDetailContainerProps {
  readonly userId: string;
  readonly entityQuery: string;
  readonly entityType: AdminUserEntityTypeFilter;
  readonly entityPage: number;
  readonly onEntityQueryChange: (value: string) => void;
  readonly onEntityTypeChange: (value: AdminUserEntityTypeFilter) => void;
  readonly onEntityPageChange: (page: number) => void;
}

export function AdminUserDetailContainer({
  userId,
  entityQuery,
  entityType,
  entityPage,
  onEntityQueryChange,
  onEntityTypeChange,
  onEntityPageChange,
}: AdminUserDetailContainerProps) {
  const [usagePeriod, setUsagePeriod] = useState<AIUsagePeriod>('30d');
  const { data } = useAdminUserDetail({ userId, usagePeriod });
  const { data: entityList, isFetching: isEntityFetching } =
    useAdminUserEntities({
      userId,
      query: entityQuery,
      entityType: entityType === 'all' ? undefined : entityType,
      page: entityPage,
    });

  return (
    <AdminUserDetailPage
      detail={data}
      usagePeriod={usagePeriod}
      onUsagePeriodChange={setUsagePeriod}
      entityList={entityList}
      entityQuery={entityQuery}
      onEntityQueryChange={onEntityQueryChange}
      entityType={entityType}
      onEntityTypeChange={onEntityTypeChange}
      entityPage={entityPage}
      onEntityPageChange={onEntityPageChange}
      isEntityFetching={isEntityFetching}
    />
  );
}
