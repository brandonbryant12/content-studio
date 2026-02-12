import { useState, useCallback } from 'react';
import {
  useInfographicList,
  getInfographicListQueryKey,
} from '../hooks/use-infographic-list';
import { useCreateInfographic } from '../hooks/use-create-infographic';
import { useOptimisticDeleteList } from '../hooks/use-optimistic-delete-list';
import { InfographicList } from './infographic-list';
import { rawApiClient } from '@/clients/apiClient';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { useBulkSelection, useBulkDelete } from '@/shared/hooks';

const deleteFn = (input: { id: string }) =>
  rawApiClient.infographics.delete(input);

export function InfographicListContainer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: infographics = [], isLoading } = useInfographicList();

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
    createMutation.mutate({
      title: 'Untitled Infographic',
      infographicType: 'key_takeaways',
      stylePreset: 'modern_minimal',
      format: 'portrait',
    });
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
    return (
      <div className="page-container-narrow">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="page-eyebrow">Visual Content</p>
            <h1 className="page-title">Infographics</h1>
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
        description="Are you sure you want to delete this infographic? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={deletingId !== null}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
