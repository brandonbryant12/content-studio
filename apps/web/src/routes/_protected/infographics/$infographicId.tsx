// routes/_protected/infographics/$infographicId.tsx
// Thin route file - delegates to feature container

import { createFileRoute } from '@tanstack/react-router';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { SuspenseBoundary } from '@/shared/components/suspense-boundary';

export const Route = createFileRoute('/_protected/infographics/$infographicId')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(
      apiClient.infographics.get.queryOptions({
        input: { id: params.infographicId },
      }),
    ),
  component: InfographicDetailPage,
});

function InfographicDetailPage() {
  const { infographicId } = Route.useParams();

  return (
    <SuspenseBoundary resetKeys={[infographicId]}>
      <div className="page-container-narrow">
        <h1 className="page-title">Infographic Detail</h1>
        <p className="text-muted-foreground">Infographic ID: {infographicId}</p>
        {/* InfographicDetailContainer will be added in later tasks */}
      </div>
    </SuspenseBoundary>
  );
}
