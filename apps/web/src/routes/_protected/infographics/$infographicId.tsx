import { createFileRoute } from '@tanstack/react-router';
import { lazy, useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { SuspenseBoundary } from '@/shared/components/suspense-boundary';

const InfographicWorkbenchContainer = lazy(() =>
  import(
    '@/features/infographics/components/infographic-workbench-container'
  ).then((m) => ({
    default: m.InfographicWorkbenchContainer,
  })),
);

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
    document.title = 'Infographic - Content Studio';
  }, []);

  return (
    <SuspenseBoundary resetKeys={[infographicId]}>
      <InfographicWorkbenchContainer infographicId={infographicId} />
    </SuspenseBoundary>
  );
}
