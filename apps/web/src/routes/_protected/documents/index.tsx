import { createFileRoute } from '@tanstack/react-router';
import { DocumentListContainer } from '@/features/documents/components/document-list-container';

export const Route = createFileRoute('/_protected/documents/')({
  component: DocumentsPage,
});

function DocumentsPage() {
  return <DocumentListContainer />;
}
