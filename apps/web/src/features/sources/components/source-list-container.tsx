import { useState, useCallback } from 'react';
import { useCreateFromUrl } from '../hooks/use-create-from-url';
import { useOptimisticDeleteSource } from '../hooks/use-optimistic-delete-source';
import { useSourceList, getSourceListQueryKey } from '../hooks/use-source-list';
import { AddFromUrlDialog } from './add-from-url-dialog';
import { ResearchChatContainer } from './research-chat-container';
import { SourceList } from './source-list';
import { apiClient } from '@/clients/apiClient';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import {
  ListPageErrorState,
  ListPageLoadingState,
} from '@/shared/components/list-page-state';
import { useBulkSelection, useBulkDelete } from '@/shared/hooks';

const deleteFn = apiClient.sources.delete.mutationOptions().mutationFn!;

export function SourceListContainer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [researchDialogOpen, setResearchDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const {
    data: sources = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useSourceList();
  const deleteMutation = useOptimisticDeleteSource();
  const createFromUrlMutation = useCreateFromUrl();
  const selection = useBulkSelection();
  const { executeBulkDelete, isBulkDeleting } = useBulkDelete({
    queryKey: getSourceListQueryKey(),
    deleteFn,
    entityName: 'source',
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
    (url: string) => {
      createFromUrlMutation.mutate(
        { url },
        {
          onSuccess: () => {
            setUrlDialogOpen(false);
          },
        },
      );
    },
    [createFromUrlMutation],
  );

  if (isLoading) {
    return <ListPageLoadingState title="Sources" />;
  }

  if (isError) {
    return (
      <ListPageErrorState
        title="Sources"
        error={error}
        fallbackMessage="Failed to load sources"
        onRetry={refetch}
      />
    );
  }

  return (
    <>
      <SourceList
        sources={sources}
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
      <ResearchChatContainer
        open={researchDialogOpen}
        onOpenChange={setResearchDialogOpen}
      />
      <ConfirmationDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Delete Source"
        description={`Are you sure you want to delete "${sources.find((d) => d.id === pendingDeleteId)?.title ?? 'this source'}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
