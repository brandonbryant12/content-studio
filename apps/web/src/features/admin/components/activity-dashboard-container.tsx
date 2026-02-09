import { useState, useMemo } from 'react';
import { ActivityDashboard } from './activity-dashboard';
import { useActivityList } from '../hooks/use-activity-list';
import { useActivityStats } from '../hooks/use-activity-stats';

type Period = '24h' | '7d' | '30d';

export function ActivityDashboardContainer() {
  const [period, setPeriod] = useState<Period>('7d');
  const [entityType, setEntityType] = useState<string | undefined>(undefined);
  const [action, setAction] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  const {
    data: activityPages,
    isLoading: feedLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useActivityList({ userId, entityType, action, limit: 50 });

  const { data: stats, isLoading: statsLoading } = useActivityStats(period);

  const activities = useMemo(() => {
    if (!activityPages?.pages) return [];
    return activityPages.pages.flatMap((page) => page.data);
  }, [activityPages]);

  return (
    <ActivityDashboard
      // Stats
      statsTotal={stats?.total ?? 0}
      statsByEntityType={stats?.byEntityType ?? []}
      statsLoading={statsLoading}
      // Filters
      period={period}
      onPeriodChange={setPeriod}
      entityType={entityType}
      onEntityTypeChange={setEntityType}
      action={action}
      onActionChange={setAction}
      userId={userId}
      onUserIdChange={setUserId}
      topUsers={stats?.topUsers ?? []}
      // Feed
      activities={activities}
      hasMore={!!hasNextPage}
      onLoadMore={() => fetchNextPage()}
      isLoadingMore={isFetchingNextPage}
      feedLoading={feedLoading}
    />
  );
}
