// routes/_protected/infographics/$infographicId.tsx
// Thin route file - delegates to feature container

import { createFileRoute } from '@tanstack/react-router';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { SuspenseBoundary } from '@/shared/components/suspense-boundary';
import { InfographicDetailContainer } from '@/features/infographics';

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

  return (
    <SuspenseBoundary resetKeys={[infographicId]}>
      <InfographicDetailContainer infographicId={infographicId} />
    </SuspenseBoundary>
  );
}
