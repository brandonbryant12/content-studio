// features/infographics/components/infographic-list-container.tsx
// Container: Handles data fetching, state management, and mutations

import { useState, useCallback } from 'react';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { useInfographicList } from '../hooks/use-infographic-list';
import { useCreateInfographic } from '../hooks/use-create-infographic';
import { useOptimisticDelete as useDeleteInfographic } from '../hooks/use-optimistic-delete';
import { InfographicList } from './infographic-list';
import type { InfographicListItem } from './infographic-item';

/**
 * Container: Fetches infographic list and coordinates mutations.
 * Manages search state and delete confirmation.
 */
export function InfographicListContainer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Data fetching
  const { data, isLoading } = useInfographicList();

  // Transform API response to presenter type
  const infographics: InfographicListItem[] =
    data?.items.map((item) => ({
      id: item.id,
      title: item.title,
      infographicType: item.infographicType,
      status: item.status,
      aspectRatio: item.aspectRatio,
      imageUrl: item.imageUrl,
      createdAt: item.createdAt,
    })) ?? [];

  // Mutations
  const createMutation = useCreateInfographic();
  const deleteMutation = useDeleteInfographic();

  const handleCreate = useCallback(() => {
    // For now, create with minimal required fields
    // This will be replaced with a proper creation flow in later tasks
    createMutation.mutate({
      title: 'Untitled Infographic',
      infographicType: 'list',
      documentIds: [], // TODO: Will need document selection
    });
  }, [createMutation]);

  const handleDeleteClick = useCallback((id: string) => {
    setConfirmDeleteId(id);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!confirmDeleteId) return;

    setDeletingId(confirmDeleteId);
    setConfirmDeleteId(null);
    deleteMutation.mutate(
      { id: confirmDeleteId },
      {
        onSettled: () => {
          setDeletingId(null);
        },
      },
    );
  }, [confirmDeleteId, deleteMutation]);

  const handleCancelDelete = useCallback(() => {
    setConfirmDeleteId(null);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Show loading state while initially fetching
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
          <Spinner className="w-6 h-6" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Delete Confirmation Dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
            <h2 className="text-lg font-semibold mb-2">Delete Infographic</h2>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete this infographic? This action
              cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancelDelete}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      <InfographicList
        infographics={infographics}
        searchQuery={searchQuery}
        isCreating={createMutation.isPending}
        deletingId={deletingId}
        onSearch={handleSearch}
        onCreate={handleCreate}
        onDelete={handleDeleteClick}
      />
    </>
  );
}
