import { SourceStatus } from '@repo/api/contracts';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { formatProductPageTitle } from '@/constants';
import { SourceDetailContainer } from '@/features/sources/components';
import { SuspenseBoundary } from '@/shared/components/suspense-boundary';
import { parseAdminEntityDetailSearch } from '@/shared/lib/admin-entity-detail-search';

export const Route = createFileRoute('/_protected/sources/$sourceId')({
  validateSearch: parseAdminEntityDetailSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const doc = await queryClient.ensureQueryData(
      apiClient.sources.get.queryOptions({
        input: { id: params.sourceId, userId: deps.userId },
      }),
    );
    if (doc.status === SourceStatus.READY) {
      await queryClient.ensureQueryData(
        apiClient.sources.getContent.queryOptions({
          input: { id: params.sourceId, userId: deps.userId },
        }),
      );
    }
  },
  component: SourcePage,
});

function SourcePage() {
  const { sourceId } = Route.useParams();
  const search = Route.useSearch();

  useEffect(() => {
    document.title = formatProductPageTitle('Source');
  }, []);

  return (
    <SuspenseBoundary resetKeys={[sourceId, search.userId]}>
      <SourceDetailContainer sourceId={sourceId} userId={search.userId} />
    </SuspenseBoundary>
  );
}
