import { MagnifyingGlassIcon, PlusIcon, UploadIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { DocumentItem } from './-components/document-item';
import UploadDocumentDialog from './-components/upload-document';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';
import { queryClient } from '@/clients/queryClient';

export const Route = createFileRoute('/_protected/documents/')({
  loader: () =>
    queryClient.ensureQueryData(
      apiClient.documents.list.queryOptions({ input: {} }),
    ),
  component: DocumentsPage,
});


function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-gray-400"
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
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
        {hasSearch ? 'No documents found' : 'No documents yet'}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
        {hasSearch
          ? 'Try adjusting your search query.'
          : 'Upload your first document to start creating podcasts and voice overs.'}
      </p>
    </div>
  );
}

function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: documents, isPending } = useQuery(
    apiClient.documents.list.queryOptions({ input: {} }),
  );

  const deleteMutation = useMutation(
    apiClient.documents.delete.mutationOptions({
      onSuccess: async () => {
        await invalidateQueries('documents', 'podcasts');
        toast.success('Document deleted');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to delete document');
      },
    }),
  );

  const filteredDocuments = documents?.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Documents
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Upload and manage your source documents
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/podcasts">
            <Button
              variant="outline"
              className="border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Podcast
            </Button>
          </Link>
          <Button
            onClick={() => setUploadOpen(true)}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white shadow-md shadow-violet-500/20"
          >
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
          className="pl-10 h-11 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:bg-white dark:focus:bg-gray-950 transition-colors"
        />
        <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>

      {/* Content */}
      {isPending ? (
        <div className="flex justify-center py-16">
          <Spinner className="w-6 h-6" />
        </div>
      ) : filteredDocuments?.length === 0 ? (
        <EmptyState hasSearch={!!searchQuery} />
      ) : (
        <div className="space-y-3">
          {filteredDocuments?.map((doc) => (
            <DocumentItem
              key={doc.id}
              document={doc}
              onDelete={() => deleteMutation.mutate({ id: doc.id })}
              isDeleting={
                deleteMutation.isPending &&
                deleteMutation.variables?.id === doc.id
              }
            />
          ))}
        </div>
      )}

      <UploadDocumentDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
