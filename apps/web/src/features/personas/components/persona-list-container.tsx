import { Spinner } from '@repo/ui/components/spinner';
import { useState, useCallback } from 'react';
import {
  usePersonaList,
  getPersonaListQueryKey,
} from '../hooks/use-persona-list';
import { PersonaChatContainer } from './persona-chat-container';
import { PersonaList } from './persona-list';
import { apiClient } from '@/clients/apiClient';
import { ErrorFallback } from '@/shared/components/error-boundary';
import { useBulkSelection, useBulkDelete } from '@/shared/hooks';
import { getErrorMessage } from '@/shared/lib/errors';

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
      <div className="page-container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="page-eyebrow">Personas</p>
            <h1 className="page-title">Personas</h1>
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
      <div className="page-container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="page-eyebrow">Personas</p>
            <h1 className="page-title">Personas</h1>
          </div>
        </div>
        <ErrorFallback
          error={
            error instanceof Error
              ? error
              : new Error(getErrorMessage(error, 'Failed to load personas'))
          }
          resetErrorBoundary={() => refetch()}
        />
      </div>
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
