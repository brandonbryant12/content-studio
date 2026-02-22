import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { ActivityDashboardContainer } from '@/features/admin/components/activity-dashboard-container';
import {
  DEFAULT_ACTIVITY_LIST_LIMIT,
  getActivityListInfiniteQueryOptions,
} from '@/features/admin/hooks/use-activity-list';

export const Route = createFileRoute('/_protected/admin/activity')({
  loader: () => {
    const activityListOptions = getActivityListInfiniteQueryOptions({
      limit: DEFAULT_ACTIVITY_LIST_LIMIT,
    });

    return Promise.all([
      queryClient.prefetchInfiniteQuery(activityListOptions),
      queryClient.ensureQueryData(
        apiClient.admin.stats.queryOptions({ input: { period: '7d' } }),
      ),
    ]);
  },
  component: ActivityPage,
});

function ActivityPage() {
  useEffect(() => {
    document.title = 'Activity - Content Studio';
  }, []);

  return <ActivityDashboardContainer />;
}
