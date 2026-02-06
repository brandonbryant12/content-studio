// routes/_protected/podcasts/$podcastId.tsx
// Thin route file - delegates to feature container

import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { PodcastDetailContainer } from '@/features/podcasts/components/podcast-detail-container';
import { SuspenseBoundary } from '@/shared/components/suspense-boundary';

export const Route = createFileRoute('/_protected/podcasts/$podcastId')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      apiClient.podcasts.get.queryOptions({ input: { id: params.podcastId } }),
    ),
  component: PodcastPage,
});

function PodcastPage() {
  const { podcastId } = Route.useParams();

  useEffect(() => {
    document.title = 'Podcast - Content Studio';
  }, []);

  return (
    <SuspenseBoundary resetKeys={[podcastId]}>
      <PodcastDetailContainer podcastId={podcastId} />
    </SuspenseBoundary>
  );
}
