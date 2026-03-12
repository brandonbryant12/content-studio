import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { formatProductPageTitle } from '@/constants';
import { PodcastDetailContainer } from '@/features/podcasts/components/podcast-detail-container';
import { SuspenseBoundary } from '@/shared/components/suspense-boundary';
import {
  type AdminEntityDetailSearch,
  parseAdminEntityDetailSearch,
} from '@/shared/lib/admin-entity-detail-search';

export interface PodcastDetailSearch extends AdminEntityDetailSearch {
  readonly version?: string;
}

const parsePodcastDetailSearch = (
  search: Record<string, unknown>,
): PodcastDetailSearch => {
  const adminSearch = parseAdminEntityDetailSearch(search);
  const version =
    typeof search.version === 'string' && search.version.trim().length > 0
      ? search.version
      : undefined;

  return version ? { ...adminSearch, version } : adminSearch;
};

export const Route = createFileRoute('/_protected/podcasts/$podcastId')({
  validateSearch: parsePodcastDetailSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ params, deps }) =>
    queryClient.ensureQueryData(
      apiClient.podcasts.get.queryOptions({
        input: { id: params.podcastId, userId: deps.userId },
      }),
    ),
  component: PodcastPage,
});

function PodcastPage() {
  const { podcastId } = Route.useParams();
  const search = Route.useSearch();

  useEffect(() => {
    document.title = formatProductPageTitle('Podcast');
  }, []);

  return (
    <SuspenseBoundary resetKeys={[podcastId, search.userId, search.version]}>
      <PodcastDetailContainer podcastId={podcastId} userId={search.userId} />
    </SuspenseBoundary>
  );
}
