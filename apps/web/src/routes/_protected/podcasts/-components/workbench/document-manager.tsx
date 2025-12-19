import { useState } from 'react';
import { PlusIcon, Cross2Icon, FileTextIcon } from '@radix-ui/react-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import type { RouterOutput } from '@repo/api/client';
import { BaseDialog } from '@/components/base-dialog';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';

type Document = RouterOutput['podcasts']['get']['documents'][number];

interface DocumentManagerProps {
  podcastId: string;
  documents: Document[];
  disabled?: boolean;
}

export function DocumentManager({ podcastId, documents, disabled }: DocumentManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: allDocuments, isPending: loadingDocs } = useQuery({
    ...apiClient.documents.list.queryOptions({ input: {} }),
    enabled: addDialogOpen,
  });

  const updateMutation = useMutation(
    apiClient.podcasts.update.mutationOptions({
      onSuccess: async () => {
        toast.success('Documents updated');
        setAddDialogOpen(false);
        await invalidateQueries('podcasts');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to update documents');
      },
    }),
  );

  const currentIds = documents.map((d) => d.id);

  const handleRemove = (docId: string) => {
    const newIds = currentIds.filter((id) => id !== docId);
    if (newIds.length === 0) {
      toast.error('Podcast must have at least one document');
      return;
    }
    updateMutation.mutate({ id: podcastId, documentIds: newIds });
  };

  const handleAddDocuments = () => {
    if (selectedIds.length === 0) return;
    const newIds = [...new Set([...currentIds, ...selectedIds])];
    updateMutation.mutate({ id: podcastId, documentIds: newIds });
    setSelectedIds([]);
  };

  const availableDocuments = allDocuments?.filter(
    (doc) => !currentIds.includes(doc.id),
  );

  const toggleDocument = (docId: string) => {
    setSelectedIds((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId],
    );
  };

  return (
    <>
      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="group flex items-center gap-2.5 p-2.5 rounded-lg bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800"
          >
            <div className="w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 uppercase">
                {doc.mimeType.split('/')[1]?.toUpperCase().slice(0, 3) || 'DOC'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {doc.title}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                {doc.wordCount.toLocaleString()} words
              </p>
            </div>
            {!disabled && documents.length > 1 && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleRemove(doc.id)}
                disabled={updateMutation.isPending}
                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
                aria-label="Remove document"
              >
                <Cross2Icon className="w-3 h-3" />
              </Button>
            )}
          </div>
        ))}

        {/* Add more button */}
        {!disabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAddDialogOpen(true)}
            className="w-full h-8 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <PlusIcon className="w-3.5 h-3.5 mr-1.5" />
            Add document
          </Button>
        )}
      </div>

      {/* Add Document Dialog */}
      <BaseDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        title="Add Documents"
        description="Select documents to add to this podcast."
        maxWidth="md"
        scrollable
        footer={{
          submitText: `Add ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''}`,
          loadingText: 'Adding...',
          submitDisabled: selectedIds.length === 0,
          onSubmit: handleAddDocuments,
          isLoading: updateMutation.isPending,
        }}
      >
        {loadingDocs ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="w-5 h-5 text-violet-500" />
          </div>
        ) : availableDocuments && availableDocuments.length > 0 ? (
          <div className="space-y-2">
            {availableDocuments.map((doc) => (
              <button
                key={doc.id}
                onClick={() => toggleDocument(doc.id)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                  selectedIds.includes(doc.id)
                    ? 'border-violet-500 bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/20 shadow-sm'
                    : 'border-gray-200/80 dark:border-gray-800/60 hover:border-violet-300 dark:hover:border-violet-700 bg-white dark:bg-gray-900/50'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/50 dark:to-blue-900/30 flex items-center justify-center shrink-0 ring-1 ring-blue-200/50 dark:ring-blue-700/30">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    {doc.mimeType.split('/')[1]?.toUpperCase().slice(0, 3) || 'DOC'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {doc.title}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                    {doc.wordCount.toLocaleString()} words
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  selectedIds.includes(doc.id)
                    ? 'border-violet-500 bg-violet-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedIds.includes(doc.id) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
              <FileTextIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No more documents available to add.
            </p>
          </div>
        )}
      </BaseDialog>
    </>
  );
}
