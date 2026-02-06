import { createFileRoute } from '@tanstack/react-router';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { PodcastListContainer } from '@/features/podcasts/components/podcast-list-container';

export const Route = createFileRoute('/_protected/podcasts/')({
  loader: () =>
    queryClient.ensureQueryData(
      apiClient.podcasts.list.queryOptions({ input: {} }),
    ),
  component: PodcastsPage,
});

function PodcastsPage() {
  return <PodcastListContainer />;
}
