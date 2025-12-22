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
      <div className="doc-manager-list">
        {documents.map((doc) => (
          <div key={doc.id} className="doc-manager-item group">
            <div className="doc-manager-item-icon">
              <span>{doc.mimeType.split('/')[1]?.toUpperCase().slice(0, 3) || 'DOC'}</span>
            </div>
            <div className="doc-manager-item-info">
              <p className="doc-manager-item-title">{doc.title}</p>
              <p className="doc-manager-item-meta">{doc.wordCount.toLocaleString()} words</p>
            </div>
            {!disabled && documents.length > 1 && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleRemove(doc.id)}
                disabled={updateMutation.isPending}
                className="doc-manager-item-remove"
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
            className="doc-manager-add-btn"
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
          <div className="loading-center">
            <Spinner className="w-5 h-5" />
          </div>
        ) : availableDocuments && availableDocuments.length > 0 ? (
          <div className="space-y-2">
            {availableDocuments.map((doc) => (
              <button
                key={doc.id}
                onClick={() => toggleDocument(doc.id)}
                className={`doc-picker-item ${selectedIds.includes(doc.id) ? 'selected' : ''}`}
              >
                <div className="doc-picker-item-icon">
                  <span>{doc.mimeType.split('/')[1]?.toUpperCase().slice(0, 3) || 'DOC'}</span>
                </div>
                <div className="doc-picker-item-info">
                  <p className="doc-picker-item-title">{doc.title}</p>
                  <p className="doc-picker-item-meta">{doc.wordCount.toLocaleString()} words</p>
                </div>
                <div className={`doc-picker-checkbox ${selectedIds.includes(doc.id) ? 'checked' : ''}`}>
                  {selectedIds.includes(doc.id) && (
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state-lg">
            <div className="empty-state-icon">
              <FileTextIcon className="w-6 h-6" />
            </div>
            <p className="text-body">No more documents available to add.</p>
          </div>
        )}
      </BaseDialog>
    </>
  );
}
