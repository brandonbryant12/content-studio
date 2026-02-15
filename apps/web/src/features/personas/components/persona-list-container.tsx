import { useState, useCallback } from 'react';
import {
  usePersonaList,
  getPersonaListQueryKey,
} from '../hooks/use-persona-list';
import { PersonaChatContainer } from './persona-chat-container';
import { PersonaList } from './persona-list';
import { rawApiClient } from '@/clients/apiClient';
import { useBulkSelection, useBulkDelete } from '@/shared/hooks';

const deleteFn = (input: { id: string }) => rawApiClient.personas.delete(input);

export function PersonaListContainer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [chatOpen, setChatOpen] = useState(false);

  const { data: personas = [], isLoading } = usePersonaList();
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

  const handleSearch = setSearchQuery;

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="page-eyebrow">Characters</p>
            <h1 className="page-title">Personas</h1>
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
      <PersonaList
        personas={personas}
        searchQuery={searchQuery}
        isCreating={false}
        onSearch={handleSearch}
        onCreate={handleCreate}
        selection={selection}
        isBulkDeleting={isBulkDeleting}
        onBulkDelete={handleBulkDelete}
      />
      <PersonaChatContainer open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
}
