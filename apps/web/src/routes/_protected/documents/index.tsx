import {
  MagnifyingGlassIcon,
  PlusIcon,
  UploadIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { DocumentItem } from './-components/document-item';
import UploadDocumentDialog from './-components/upload-document';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';
import { useDocuments } from '@/db';

export const Route = createFileRoute('/_protected/documents/')({
  component: DocumentsPage,
});

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="empty-state-lg">
      <div className="empty-state-icon">
        <svg
          className="w-7 h-7 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
      </div>
      <h3 className="empty-state-title">
        {hasSearch ? 'No documents found' : 'No documents yet'}
      </h3>
      <p className="empty-state-description">
        {hasSearch
          ? 'Try adjusting your search query.'
          : 'Upload your first document to start creating podcasts and voice overs.'}
      </p>
    </div>
  );
}

function DocumentsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: documents, isLoading: isPending } = useDocuments();

  const deleteMutation = useMutation(
    apiClient.documents.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['documents'] });
        toast.success('Document deleted');
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to delete document'));
      },
      onSettled: () => {
        setDeletingId(null);
      },
    }),
  );

  const handleDelete = (id: string) => {
    setDeletingId(id);
    deleteMutation.mutate({ id });
  };

  const filteredDocuments = documents?.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="page-container-narrow">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="page-eyebrow">Source Content</p>
          <h1 className="page-title">Documents</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/podcasts">
            <Button variant="outline">
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Podcast
            </Button>
          </Link>
          <Button onClick={() => setUploadOpen(true)}>
            <UploadIcon className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search documents..."
          className="search-input"
        />
        <MagnifyingGlassIcon className="search-icon" />
      </div>

      {/* Content */}
      {isPending ? (
        <div className="loading-center-lg">
          <Spinner className="w-6 h-6" />
        </div>
      ) : filteredDocuments?.length === 0 ? (
        <EmptyState hasSearch={!!searchQuery} />
      ) : (
        <div className="space-y-2">
          {filteredDocuments?.map((doc) => (
            <DocumentItem
              key={doc.id}
              document={doc}
              onDelete={() => handleDelete(doc.id)}
              isDeleting={deletingId === doc.id}
            />
          ))}
        </div>
      )}

      <UploadDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
