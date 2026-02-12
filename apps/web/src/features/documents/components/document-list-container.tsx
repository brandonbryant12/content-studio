import { useState, useCallback } from 'react';
import { useCreateFromUrl } from '../hooks/use-create-from-url';
import {
  useDocumentList,
  getDocumentListQueryKey,
} from '../hooks/use-document-list';
import { useOptimisticDeleteDocument } from '../hooks/use-optimistic-delete-document';
import { useStartResearch } from '../hooks/use-start-research';
import { AddFromUrlDialog } from './add-from-url-dialog';
import { DocumentList } from './document-list';
import { StartResearchDialog } from './start-research-dialog';
import { rawApiClient } from '@/clients/apiClient';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { useBulkSelection, useBulkDelete } from '@/shared/hooks';

const deleteFn = (input: { id: string }) =>
  rawApiClient.documents.delete(input);

export function DocumentListContainer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [researchDialogOpen, setResearchDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: documents = [], isLoading } = useDocumentList();
  const deleteMutation = useOptimisticDeleteDocument();
  const createFromUrlMutation = useCreateFromUrl();
  const startResearchMutation = useStartResearch();
  const selection = useBulkSelection();
  const { executeBulkDelete, isBulkDeleting } = useBulkDelete({
    queryKey: getDocumentListQueryKey(),
    deleteFn,
    entityName: 'document',
  });

  const handleDeleteConfirm = useCallback(() => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    setDeletingId(id);
    deleteMutation.mutate(
      { id },
      {
        onSettled: () => {
          setDeletingId(null);
        },
      },
    );
  }, [pendingDeleteId, deleteMutation]);

  const handleBulkDelete = useCallback(async () => {
    await executeBulkDelete(selection.selectedIds);
    selection.deselectAll();
  }, [executeBulkDelete, selection]);

  const handleCreateFromUrl = useCallback(
    (url: string, title?: string) => {
      createFromUrlMutation.mutate(
        { url, title },
        {
          onSuccess: () => {
            setUrlDialogOpen(false);
          },
        },
      );
    },
    [createFromUrlMutation],
  );

  const handleStartResearch = useCallback(
    (query: string, title?: string) => {
      startResearchMutation.mutate(
        { query, title },
        {
          onSuccess: () => {
            setResearchDialogOpen(false);
          },
        },
      );
    },
    [startResearchMutation],
  );

  if (isLoading) {
    return (
      <div className="page-container-narrow">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="page-eyebrow">Source Content</p>
            <h1 className="page-title">Knowledge Base</h1>
          </div>
        </div>
        <div className="loading-center-lg">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <>
      <DocumentList
        documents={documents}
        searchQuery={searchQuery}
        uploadOpen={uploadOpen}
        deletingId={deletingId}
        onSearch={setSearchQuery}
        onUploadOpen={setUploadOpen}
        onUrlDialogOpen={setUrlDialogOpen}
        onResearchDialogOpen={setResearchDialogOpen}
        onDelete={setPendingDeleteId}
        selection={selection}
        isBulkDeleting={isBulkDeleting}
        onBulkDelete={handleBulkDelete}
      />
      <AddFromUrlDialog
        open={urlDialogOpen}
        onOpenChange={setUrlDialogOpen}
        onSubmit={handleCreateFromUrl}
        isSubmitting={createFromUrlMutation.isPending}
      />
      <StartResearchDialog
        open={researchDialogOpen}
        onOpenChange={setResearchDialogOpen}
        onSubmit={handleStartResearch}
        isSubmitting={startResearchMutation.isPending}
      />
      <ConfirmationDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
