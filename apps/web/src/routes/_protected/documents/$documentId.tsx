// routes/_protected/documents/$documentId.tsx
// Thin route file - delegates to feature container

import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { DocumentDetailContainer } from '@/features/documents/components/document-detail-container';
import { SuspenseBoundary } from '@/shared/components/suspense-boundary';

export const Route = createFileRoute('/_protected/documents/$documentId')({
  loader: ({ params }) =>
    Promise.all([
      queryClient.ensureQueryData(
        apiClient.documents.get.queryOptions({
          input: { id: params.documentId },
        }),
      ),
      queryClient.ensureQueryData(
        apiClient.documents.getContent.queryOptions({
          input: { id: params.documentId },
        }),
      ),
    ]),
  component: DocumentPage,
});

function DocumentPage() {
  const { documentId } = Route.useParams();

  useEffect(() => {
    document.title = 'Document - Content Studio';
  }, []);

  return (
    <SuspenseBoundary resetKeys={[documentId]}>
      <DocumentDetailContainer documentId={documentId} />
    </SuspenseBoundary>
  );
}
