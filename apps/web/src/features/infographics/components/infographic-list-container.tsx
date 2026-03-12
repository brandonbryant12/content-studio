import { useState, useCallback } from 'react';
import { useCreateInfographic } from '../hooks/use-create-infographic';
import {
  useInfographicList,
  getInfographicListQueryKey,
} from '../hooks/use-infographic-list';
import { useOptimisticDeleteList } from '../hooks/use-optimistic-delete-list';
import { InfographicList } from './infographic-list';
import { apiClient } from '@/clients/apiClient';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import {
  ListPageErrorState,
  ListPageLoadingState,
} from '@/shared/components/list-page-state';
import { useBulkSelection, useBulkDelete } from '@/shared/hooks';

const deleteFn = apiClient.infographics.delete.mutationOptions().mutationFn!;

export function InfographicListContainer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const {
    data: infographics = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useInfographicList();

  const createMutation = useCreateInfographic();
  const deleteMutation = useOptimisticDeleteList();

  // Bulk selection & delete
  const selection = useBulkSelection();
  const { executeBulkDelete, isBulkDeleting } = useBulkDelete({
    queryKey: getInfographicListQueryKey(),
    deleteFn,
    entityName: 'infographic',
  });

  const handleCreate = useCallback(() => {
    createMutation.mutate();
  }, [createMutation]);

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

  if (isLoading) {
    return <ListPageLoadingState title="Infographics" />;
  }

  if (isError) {
    return (
      <ListPageErrorState
        title="Infographics"
        error={error}
        fallbackMessage="Failed to load infographics"
        onRetry={refetch}
      />
    );
  }

  return (
    <>
      <InfographicList
        infographics={infographics}
        searchQuery={searchQuery}
        isCreating={createMutation.isPending}
        deletingId={deletingId}
        onSearch={setSearchQuery}
        onCreate={handleCreate}
        onDelete={setPendingDeleteId}
        selection={selection}
        isBulkDeleting={isBulkDeleting}
        onBulkDelete={handleBulkDelete}
      />
      <ConfirmationDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Delete Infographic"
        description={`Are you sure you want to delete "${infographics.find((i) => i.id === pendingDeleteId)?.title ?? 'this infographic'}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={deletingId !== null}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
