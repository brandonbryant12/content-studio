import { SourceStatus } from '@repo/api/contracts';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { SourceDetailContainer } from '@/features/sources/components';
import { SuspenseBoundary } from '@/shared/components/suspense-boundary';

export const Route = createFileRoute('/_protected/sources/$sourceId')({
  loader: async ({ params }) => {
    const doc = await queryClient.ensureQueryData(
      apiClient.sources.get.queryOptions({
        input: { id: params.sourceId },
      }),
    );
    if (doc.status === SourceStatus.READY) {
      await queryClient.ensureQueryData(
        apiClient.sources.getContent.queryOptions({
          input: { id: params.sourceId },
        }),
      );
    }
  },
  component: SourcePage,
});

function SourcePage() {
  const { sourceId } = Route.useParams();

  useEffect(() => {
    document.title = 'Source - Content Studio';
  }, []);

  return (
    <SuspenseBoundary resetKeys={[sourceId]}>
      <SourceDetailContainer sourceId={sourceId} />
    </SuspenseBoundary>
  );
}
