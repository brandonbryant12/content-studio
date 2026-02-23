import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
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
  useEffect(() => {
    document.title = 'Documents - Content Studio';
  }, []);

  return <DocumentListContainer />;
}
