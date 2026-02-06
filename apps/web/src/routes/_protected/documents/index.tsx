import { createFileRoute } from '@tanstack/react-router';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import { DocumentListContainer } from '@/features/documents/components/document-list-container';

export const Route = createFileRoute('/_protected/documents/')({
  loader: () =>
    queryClient.ensureQueryData(
      apiClient.documents.list.queryOptions({ input: {} }),
    ),
  component: DocumentsPage,
});

function DocumentsPage() {
  return <DocumentListContainer />;
}
