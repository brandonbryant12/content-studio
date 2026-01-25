import { createFileRoute } from '@tanstack/react-router';
import { PodcastListContainer } from '@/features/podcasts/components/podcast-list-container';

export const Route = createFileRoute('/_protected/podcasts/')({
  component: PodcastsPage,
});

function PodcastsPage() {
  return <PodcastListContainer />;
}
