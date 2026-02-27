import { Spinner } from '@repo/ui/components/spinner';
import { useState, useCallback } from 'react';
import type { MutationFunctionContext } from '@tanstack/react-query';
import { useCreateInfographic } from '../hooks/use-create-infographic';
import {
  useInfographicList,
  getInfographicListQueryKey,
} from '../hooks/use-infographic-list';
import { useOptimisticDeleteList } from '../hooks/use-optimistic-delete-list';
import { InfographicList } from './infographic-list';
import { apiClient } from '@/clients/apiClient';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { ErrorFallback } from '@/shared/components/error-boundary';
import { useBulkSelection, useBulkDelete } from '@/shared/hooks';
import { getErrorMessage } from '@/shared/lib/errors';

const deleteFn = (input: { id: string }, context: MutationFunctionContext) =>
  apiClient.infographics.delete.mutationOptions().mutationFn!(input, context);

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

  const handleCreate = useCallback(
    (input: {
      title: string;
      format: 'portrait' | 'square' | 'landscape' | 'og_card';
      prompt?: string;
      autoGenerate?: boolean;
    }) => {
      createMutation.mutate(input);
    },
    [createMutation],
  );

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
            <p className="page-eyebrow">Infographics</p>
            <h1 className="page-title">Infographics</h1>
          </div>
        </div>
        <div className="loading-center-lg">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page-container-narrow">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="page-eyebrow">Infographics</p>
            <h1 className="page-title">Infographics</h1>
          </div>
        </div>
        <ErrorFallback
          error={
            error instanceof Error
              ? error
              : new Error(getErrorMessage(error, 'Failed to load infographics'))
          }
          resetErrorBoundary={() => refetch()}
        />
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
        description={`Are you sure you want to delete "${infographics.find((i) => i.id === pendingDeleteId)?.title ?? 'this infographic'}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={deletingId !== null}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
