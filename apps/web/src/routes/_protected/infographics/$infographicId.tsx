import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { formatProductPageTitle } from '@/constants';
import { InfographicWorkbenchContainer } from '@/features/infographics/components/infographic-workbench-container';
import { SuspenseBoundary } from '@/shared/components/suspense-boundary';

export const Route = createFileRoute('/_protected/infographics/$infographicId')(
  {
    loader: ({ params }) =>
      queryClient.ensureQueryData(
        apiClient.infographics.get.queryOptions({
          input: { id: params.infographicId },
        }),
      ),
    component: InfographicDetailPage,
  },
);

function InfographicDetailPage() {
  const { infographicId } = Route.useParams();

  useEffect(() => {
    document.title = formatProductPageTitle('Infographic');
  }, []);

  return (
    <SuspenseBoundary resetKeys={[infographicId]}>
      <InfographicWorkbenchContainer infographicId={infographicId} />
    </SuspenseBoundary>
  );
}
