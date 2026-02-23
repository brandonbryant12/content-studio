import { useCallback, useState } from 'react';
import { useCreateSlideDeck, useDeleteSlideDeck, useSlideDecks } from '../hooks';
import { SlideDeckList } from './slide-deck-list';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';

export function SlideDeckListContainer() {
  const { data: slideDecks = [] } = useSlideDecks();
  const createMutation = useCreateSlideDeck();
  const deleteMutation = useDeleteSlideDeck();

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = useCallback(() => {
    createMutation.mutate({
      title: 'Untitled Slide Deck',
      theme: 'executive',
      slides: [],
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
        onSettled: () => setDeletingId(null),
      },
    );
  }, [pendingDeleteId, deleteMutation]);

  return (
    <>
      <SlideDeckList
        slideDecks={slideDecks}
        isCreating={createMutation.isPending}
        deletingId={deletingId}
        onCreate={handleCreate}
        onDelete={setPendingDeleteId}
      />
      <ConfirmationDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Delete Slide Deck"
        description="Are you sure you want to delete this slide deck? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={deletingId !== null}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
