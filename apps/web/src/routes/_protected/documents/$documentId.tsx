import { SourceStatus } from '@repo/api/contracts';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { DocumentDetailContainer } from '@/features/documents/components/document-detail-container';
import { SuspenseBoundary } from '@/shared/components/suspense-boundary';

export const Route = createFileRoute('/_protected/documents/$documentId')({
  loader: async ({ params }) => {
    const doc = await queryClient.ensureQueryData(
      apiClient.sources.get.queryOptions({
        input: { id: params.documentId },
      }),
    );
    if (doc.status === SourceStatus.READY) {
      await queryClient.ensureQueryData(
        apiClient.sources.getContent.queryOptions({
          input: { id: params.documentId },
        }),
      );
    }
  },
  component: DocumentPage,
});

function DocumentPage() {
  const { documentId } = Route.useParams();

  useEffect(() => {
    document.title = 'Source - Content Studio';
  }, []);

  return (
    <SuspenseBoundary resetKeys={[documentId]}>
      <DocumentDetailContainer documentId={documentId} />
    </SuspenseBoundary>
  );
}
