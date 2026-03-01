import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { Period } from '../types';
import {
  DEFAULT_ACTIVITY_LIST_LIMIT,
  useActivityList,
} from '../hooks/use-activity-list';
import { useActivityStats } from '../hooks/use-activity-stats';
import { ActivityDashboard } from './activity-dashboard';
import { ErrorFallback } from '@/shared/components/error-boundary';
import { getErrorMessage } from '@/shared/lib/errors';

export function ActivityDashboardContainer() {
  const [period, setPeriod] = useState<Period>('7d');
  const [entityType, setEntityType] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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
    isError: feedError,
    error: feedErrorObj,
    refetch: refetchFeed,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useActivityList({
    userId,
    entityType,
    search: debouncedSearch,
    limit: DEFAULT_ACTIVITY_LIST_LIMIT,
  });

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    error: statsErrorObj,
    refetch: refetchStats,
  } = useActivityStats(period);

  const activities = useMemo(() => {
    if (!activityPages?.pages) return [];
    return activityPages.pages.flatMap((page) => page.data);
  }, [activityPages]);

  if (feedError || statsError) {
    const firstError = feedErrorObj ?? statsErrorObj;
    return (
      <ErrorFallback
        error={
          firstError instanceof Error
            ? firstError
            : new Error(
                getErrorMessage(
                  firstError,
                  'Failed to load activity dashboard',
                ),
              )
        }
        resetErrorBoundary={() => {
          refetchFeed();
          refetchStats();
        }}
      />
    );
  }

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
      onLoadMore={fetchNextPage}
      isLoadingMore={isFetchingNextPage}
      feedLoading={feedLoading}
    />
  );
}
