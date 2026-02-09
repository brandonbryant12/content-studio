import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { ActivityDashboardContainer } from '@/features/admin/components/activity-dashboard-container';

export const Route = createFileRoute('/_protected/admin/activity')({
  loader: () =>
    Promise.all([
      queryClient.ensureQueryData(
        apiClient.admin.list.queryOptions({ input: {} }),
      ),
      queryClient.ensureQueryData(
        apiClient.admin.stats.queryOptions({ input: { period: '7d' } }),
      ),
    ]),
  component: ActivityPage,
});

function ActivityPage() {
  useEffect(() => {
    document.title = 'Activity - Content Studio';
  }, []);

  return <ActivityDashboardContainer />;
}
