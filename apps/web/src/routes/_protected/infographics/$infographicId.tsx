import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { formatProductPageTitle } from '@/constants';
import { InfographicWorkbenchContainer } from '@/features/infographics/components/infographic-workbench-container';
import { SuspenseBoundary } from '@/shared/components/suspense-boundary';
import { parseAdminEntityDetailSearch } from '@/shared/lib/admin-entity-detail-search';

export const Route = createFileRoute('/_protected/infographics/$infographicId')(
  {
    validateSearch: parseAdminEntityDetailSearch,
    loaderDeps: ({ search }) => search,
    loader: ({ params, deps }) =>
      queryClient.ensureQueryData(
        apiClient.infographics.get.queryOptions({
          input: { id: params.infographicId, userId: deps.userId },
        }),
      ),
    component: InfographicDetailPage,
  },
);

function InfographicDetailPage() {
  const { infographicId } = Route.useParams();
  const search = Route.useSearch();

  useEffect(() => {
    document.title = formatProductPageTitle('Infographic');
  }, []);

  return (
    <SuspenseBoundary resetKeys={[infographicId, search.userId]}>
      <InfographicWorkbenchContainer
        infographicId={infographicId}
        userId={search.userId}
      />
    </SuspenseBoundary>
  );
}
