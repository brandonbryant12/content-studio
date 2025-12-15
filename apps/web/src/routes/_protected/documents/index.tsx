import {
  MagnifyingGlassIcon,
  TrashIcon,
  UploadIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import UploadDocumentDialog from './-components/upload-document';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import Spinner from '@/routes/-components/common/spinner';

export const Route = createFileRoute('/_protected/documents/')({
  loader: () =>
    queryClient.ensureQueryData(
      apiClient.documents.list.queryOptions({ input: {} }),
    ),
  component: DocumentsPage,
});

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSource(source: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    manual: {
      label: 'Text',
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    },
    upload_txt: {
      label: 'TXT',
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    },
    upload_pdf: {
      label: 'PDF',
      color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    },
    upload_docx: {
      label: 'DOCX',
      color:
        'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
    },
    upload_pptx: {
      label: 'PPTX',
      color:
        'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
    },
  };
  return (
    map[source] ?? {
      label: source,
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    }
  );
}

function DocumentIcon({ source }: { source: string }) {
  const color = source.includes('pdf')
    ? 'text-red-500'
    : source.includes('docx')
      ? 'text-indigo-500'
      : source.includes('pptx')
        ? 'text-orange-500'
        : source.includes('txt')
          ? 'text-blue-500'
          : 'text-gray-500';

  return (
    <div
      className={`w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${color}`}
    >
      <svg
        className="w-5 h-5"
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
  );
}

function DocumentItem({
  document,
  onDelete,
  isDeleting,
}: {
  document: RouterOutput['documents']['list'][number];
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const sourceInfo = formatSource(document.source);

  return (
    <div className="group border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 rounded-xl flex items-center gap-4 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all">
      <DocumentIcon source={document.source} />
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
          {document.title}
        </h3>
        <div className="flex items-center gap-3 mt-1.5">
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-medium ${sourceInfo.color}`}
          >
            {sourceInfo.label}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {document.wordCount.toLocaleString()} words
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatFileSize(document.originalFileSize)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {new Date(document.createdAt).toLocaleDateString()}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={isDeleting}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
        >
          {isDeleting ? (
            <Spinner className="w-4 h-4" />
          ) : (
            <TrashIcon className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

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
        await queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            if (!Array.isArray(key) || key.length === 0) return false;
            // oRPC uses path arrays like ['documents', 'list'] as the first element
            const firstKey = key[0];
            if (Array.isArray(firstKey)) {
              return firstKey[0] === 'documents' || firstKey[0] === 'projects';
            }
            return firstKey === 'documents' || firstKey === 'projects';
          },
        });
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
        <Button
          onClick={() => setUploadOpen(true)}
          className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white shadow-md shadow-violet-500/20"
        >
          <UploadIcon className="w-4 h-4 mr-2" />
          Upload
        </Button>
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
