import { useState, useCallback } from 'react';
import {
  usePersonaList,
  getPersonaListQueryKey,
} from '../hooks/use-persona-list';
import { PersonaChatContainer } from './persona-chat-container';
import { PersonaList } from './persona-list';
import { apiClient } from '@/clients/apiClient';
import {
  ListPageErrorState,
  ListPageLoadingState,
} from '@/shared/components/list-page-state';
import { useBulkSelection, useBulkDelete } from '@/shared/hooks';

const deleteFn = apiClient.personas.delete.mutationOptions().mutationFn!;

export function PersonaListContainer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [chatOpen, setChatOpen] = useState(false);

  const {
    data: personas = [],
    isLoading,
    isError,
    error,
    refetch,
  } = usePersonaList();
  const selection = useBulkSelection();
  const { executeBulkDelete, isBulkDeleting } = useBulkDelete({
    queryKey: getPersonaListQueryKey(),
    deleteFn,
    entityName: 'persona',
  });

  const handleCreate = useCallback(() => setChatOpen(true), []);

  const handleBulkDelete = useCallback(async () => {
    await executeBulkDelete(selection.selectedIds);
    selection.deselectAll();
  }, [executeBulkDelete, selection]);

  if (isLoading) {
    return (
      <ListPageLoadingState
        title="Personas"
        containerClassName="page-container"
      />
    );
  }

  if (isError) {
    return (
      <ListPageErrorState
        title="Personas"
        error={error}
        fallbackMessage="Failed to load personas"
        onRetry={refetch}
        containerClassName="page-container"
      />
    );
  }

  return (
    <>
      <PersonaList
        personas={personas}
        searchQuery={searchQuery}
        isCreating={false}
        onSearch={setSearchQuery}
        onCreate={handleCreate}
        selection={selection}
        isBulkDeleting={isBulkDeleting}
        onBulkDelete={handleBulkDelete}
      />
      <PersonaChatContainer open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
}
