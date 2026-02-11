import { useState, useCallback } from 'react';
import {
  useInfographicList,
  getInfographicListQueryKey,
} from '../hooks/use-infographic-list';
import { useOptimisticCreate } from '../hooks/use-optimistic-create';
import { useOptimisticDeleteList } from '../hooks/use-optimistic-delete-list';
import { InfographicList } from './infographic-list';
import { rawApiClient } from '@/clients/apiClient';
import { useBulkSelection, useBulkDelete } from '@/shared/hooks';

const deleteFn = (input: { id: string }) =>
  rawApiClient.infographics.delete(input);

export function InfographicListContainer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: infographics = [], isLoading } = useInfographicList();

  const createMutation = useOptimisticCreate();
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

  const handleDelete = useCallback(
    (id: string) => {
      setDeletingId(id);
      deleteMutation.mutate(
        { id },
        {
          onSettled: () => {
            setDeletingId(null);
          },
        },
      );
    },
    [deleteMutation],
  );

  const handleBulkDelete = useCallback(async () => {
    await executeBulkDelete(selection.selectedIds);
    selection.deselectAll();
  }, [executeBulkDelete, selection]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

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
    <InfographicList
      infographics={infographics}
      searchQuery={searchQuery}
      isCreating={createMutation.isPending}
      deletingId={deletingId}
      onSearch={handleSearch}
      onCreate={handleCreate}
      onDelete={handleDelete}
      selection={selection}
      isBulkDeleting={isBulkDeleting}
      onBulkDelete={handleBulkDelete}
    />
  );
}
