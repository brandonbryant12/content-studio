import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ActivityDashboard } from './activity-dashboard';
import { useActivityList } from '../hooks/use-activity-list';
import { useActivityStats } from '../hooks/use-activity-stats';

type Period = '24h' | '7d' | '30d';

export function ActivityDashboardContainer() {
  const [period, setPeriod] = useState<Period>('7d');
  const [entityType, setEntityType] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, []);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const {
    data: activityPages,
    isLoading: feedLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useActivityList({
    userId,
    entityType,
    search: debouncedSearch,
    limit: 50,
  });

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
      userId={userId}
      onUserIdChange={setUserId}
      topUsers={stats?.topUsers ?? []}
      searchQuery={searchQuery}
      onSearchChange={handleSearchChange}
      // Feed
      activities={activities}
      hasMore={!!hasNextPage}
      onLoadMore={() => fetchNextPage()}
      isLoadingMore={isFetchingNextPage}
      feedLoading={feedLoading}
    />
  );
}
