// features/brands/components/brand-list-container.tsx
// Container: Handles data fetching, state management, and mutations

import { useState, useCallback } from 'react';
import { useBrandList } from '../hooks/use-brand-list';
import { useOptimisticCreate } from '../hooks/use-optimistic-create';
import { useOptimisticDeleteList } from '../hooks/use-optimistic-delete-list';
import { BrandList } from './brand-list';

/**
 * Container: Fetches brand list and coordinates mutations.
 * Manages search state locally.
 */
export function BrandListContainer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Data fetching
  const { data: brands = [], isLoading } = useBrandList();

  // Mutations
  const createMutation = useOptimisticCreate();
  const deleteMutation = useOptimisticDeleteList();

  const handleCreate = useCallback(() => {
    createMutation.mutate({
      name: 'Untitled Brand',
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

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Show loading state while initially fetching
  if (isLoading) {
    return (
      <div className="page-container-narrow">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="page-eyebrow">Brand Identity</p>
            <h1 className="page-title">Brands</h1>
          </div>
        </div>
        <div className="loading-center-lg">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <BrandList
      brands={brands}
      searchQuery={searchQuery}
      isCreating={createMutation.isPending}
      deletingId={deletingId}
      onSearch={handleSearch}
      onCreate={handleCreate}
      onDelete={handleDelete}
    />
  );
}
