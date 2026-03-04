import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { DashboardContainer } from '@/features/dashboard/components/dashboard-container';
import { SuspenseBoundary } from '@/shared/components/suspense-boundary';

export const Route = createFileRoute('/_protected/dashboard')({
  loader: () =>
    Promise.all([
      queryClient.ensureQueryData(
        apiClient.sources.list.queryOptions({ input: {} }),
      ),
      queryClient.ensureQueryData(
        apiClient.podcasts.list.queryOptions({ input: {} }),
      ),
      queryClient.ensureQueryData(
        apiClient.voiceovers.list.queryOptions({ input: {} }),
      ),
      queryClient.ensureQueryData(
        apiClient.infographics.list.queryOptions({ input: {} }),
      ),
    ]),
  component: DashboardPage,
});

function DashboardPage() {
  useEffect(() => {
    document.title = 'Dashboard - Content Studio';
  }, []);

  return (
    <SuspenseBoundary>
      <DashboardContainer />
    </SuspenseBoundary>
  );
}
