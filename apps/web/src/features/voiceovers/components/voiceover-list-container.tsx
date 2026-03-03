import { useState, useCallback } from 'react';
import { useCreateVoiceover } from '../hooks/use-create-voiceover';
import { useOptimisticDeleteList } from '../hooks/use-optimistic-delete-list';
import {
  useVoiceoverList,
  getVoiceoverListQueryKey,
} from '../hooks/use-voiceover-list';
import { VoiceoverList } from './voiceover-list';
import { apiClient } from '@/clients/apiClient';
import {
  ListPageErrorState,
  ListPageLoadingState,
} from '@/shared/components/list-page-state';
import { useBulkSelection, useBulkDelete } from '@/shared/hooks';
import { useQuickPlay } from '@/shared/hooks/use-quick-play';

const deleteFn = apiClient.voiceovers.delete.mutationOptions().mutationFn!;

export function VoiceoverListContainer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    data: voiceovers = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useVoiceoverList();
  const createMutation = useCreateVoiceover();
  const deleteMutation = useOptimisticDeleteList();
  const quickPlay = useQuickPlay();
  const selection = useBulkSelection();
  const { executeBulkDelete, isBulkDeleting } = useBulkDelete({
    queryKey: getVoiceoverListQueryKey(),
    deleteFn,
    entityName: 'voiceover',
  });

  const handleCreate = useCallback(() => {
    createMutation.mutate({
      title: 'Untitled Voiceover',
    });
  }, [createMutation]);

  const handleDelete = useCallback(
    (id: string) => {
      if (quickPlay.playingId === id) {
        quickPlay.stop();
      }
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
    [deleteMutation, quickPlay],
  );

  const handleBulkDelete = useCallback(async () => {
    quickPlay.stop();
    await executeBulkDelete(selection.selectedIds);
    selection.deselectAll();
  }, [executeBulkDelete, selection, quickPlay]);

  if (isLoading) {
    return <ListPageLoadingState title="Voiceovers" />;
  }

  if (isError) {
    return (
      <ListPageErrorState
        title="Voiceovers"
        error={error}
        fallbackMessage="Failed to load voiceovers"
        onRetry={refetch}
      />
    );
  }

  return (
    <VoiceoverList
      voiceovers={voiceovers}
      searchQuery={searchQuery}
      isCreating={createMutation.isPending}
      deletingId={deletingId}
      onSearch={setSearchQuery}
      onCreate={handleCreate}
      onDelete={handleDelete}
      quickPlay={quickPlay}
      selection={selection}
      isBulkDeleting={isBulkDeleting}
      onBulkDelete={handleBulkDelete}
    />
  );
}
