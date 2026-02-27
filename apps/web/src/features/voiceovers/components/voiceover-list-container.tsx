import { Spinner } from '@repo/ui/components/spinner';
import { useState, useCallback } from 'react';
import type { MutationFunctionContext } from '@tanstack/react-query';
import { useCreateVoiceover } from '../hooks/use-create-voiceover';
import { useOptimisticDeleteList } from '../hooks/use-optimistic-delete-list';
import {
  useVoiceoverList,
  getVoiceoverListQueryKey,
} from '../hooks/use-voiceover-list';
import { VoiceoverList } from './voiceover-list';
import { apiClient } from '@/clients/apiClient';
import { ErrorFallback } from '@/shared/components/error-boundary';
import { useBulkSelection, useBulkDelete } from '@/shared/hooks';
import { useQuickPlay } from '@/shared/hooks/use-quick-play';
import { getErrorMessage } from '@/shared/lib/errors';

const deleteFn = (input: { id: string }, context: MutationFunctionContext) =>
  apiClient.voiceovers.delete.mutationOptions().mutationFn!(input, context);

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

  const handleSearch = setSearchQuery;

  if (isLoading) {
    return (
      <div className="page-container-narrow">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="page-eyebrow">Voiceovers</p>
            <h1 className="page-title">Voiceovers</h1>
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
            <p className="page-eyebrow">Voiceovers</p>
            <h1 className="page-title">Voiceovers</h1>
          </div>
        </div>
        <ErrorFallback
          error={
            error instanceof Error
              ? error
              : new Error(getErrorMessage(error, 'Failed to load voiceovers'))
          }
          resetErrorBoundary={() => refetch()}
        />
      </div>
    );
  }

  return (
    <VoiceoverList
      voiceovers={voiceovers}
      searchQuery={searchQuery}
      isCreating={createMutation.isPending}
      deletingId={deletingId}
      onSearch={handleSearch}
      onCreate={handleCreate}
      onDelete={handleDelete}
      quickPlay={quickPlay}
      selection={selection}
      isBulkDeleting={isBulkDeleting}
      onBulkDelete={handleBulkDelete}
    />
  );
}
