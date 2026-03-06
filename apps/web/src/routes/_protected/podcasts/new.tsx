import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { SetupWizard } from '@/features/podcasts/components/setup';

export const Route = createFileRoute('/_protected/podcasts/new')({
  loader: () =>
    queryClient.ensureQueryData(
      apiClient.sources.list.queryOptions({ input: {} }),
    ),
  component: NewPodcastPage,
});

function NewPodcastPage() {
  useEffect(() => {
    document.title = 'Create Podcast - Content Studio';
  }, []);

  return <SetupWizard />;
}
