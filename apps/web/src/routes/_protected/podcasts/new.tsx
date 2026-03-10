import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { formatProductPageTitle } from '@/constants';
import { SetupWizard } from '@/features/podcasts/components/setup';

export interface NewPodcastSearch {
  readonly sourceId?: string;
}

export const Route = createFileRoute('/_protected/podcasts/new')({
  validateSearch: (search): NewPodcastSearch => ({
    sourceId:
      typeof search.sourceId === 'string' && search.sourceId.trim().length > 0
        ? search.sourceId.trim()
        : undefined,
  }),
  loader: () =>
    queryClient.ensureQueryData(
      apiClient.sources.list.queryOptions({ input: {} }),
    ),
  component: NewPodcastPage,
});

function NewPodcastPage() {
  const { sourceId } = Route.useSearch();

  useEffect(() => {
    document.title = formatProductPageTitle('Create Podcast');
  }, []);

  return <SetupWizard initialSourceIds={sourceId ? [sourceId] : undefined} />;
}
