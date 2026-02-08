import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense, useEffect } from 'react';
import { Spinner } from '@repo/ui/components/spinner';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';

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
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-57px)]">
          <Spinner />
        </div>
      }
    >
      <InfographicWorkbenchContainer infographicId={infographicId} />
    </Suspense>
  );
}
