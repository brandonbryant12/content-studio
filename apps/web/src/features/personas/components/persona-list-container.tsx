import { useState, useCallback } from 'react';
import { usePersonas } from '../hooks/use-personas';
import {
  useCreatePersona,
  useUpdatePersona,
  useDeletePersona,
} from '../hooks/use-persona-mutations';
import { PersonaList } from './persona-list';
import { PersonaFormDialog, type PersonaFormData } from './persona-form-dialog';
import type { PersonaListItem } from './persona-item';

/**
 * Container: Fetches persona list and coordinates mutations.
 */
export function PersonaListContainer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<PersonaListItem | null>(
    null,
  );

  // Data fetching
  const { data: personas = [], isLoading } = usePersonas();

  // Mutations
  const createMutation = useCreatePersona({
    onSuccess: () => setDialogOpen(false),
  });
  const updateMutation = useUpdatePersona({
    onSuccess: () => {
      setDialogOpen(false);
      setEditingPersona(null);
    },
  });
  const deleteMutation = useDeletePersona();

  const handleCreate = useCallback(() => {
    setEditingPersona(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((persona: PersonaListItem) => {
    setEditingPersona(persona);
    setDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(
    (data: PersonaFormData) => {
      if (editingPersona) {
        updateMutation.mutate({
          id: editingPersona.id as Parameters<typeof updateMutation.mutate>[0]['id'],
          name: data.name,
          role: data.role,
          personalityDescription: data.personalityDescription ?? undefined,
          speakingStyle: data.speakingStyle ?? undefined,
        });
      } else {
        createMutation.mutate({
          name: data.name,
          role: data.role,
          personalityDescription: data.personalityDescription ?? undefined,
          speakingStyle: data.speakingStyle ?? undefined,
        });
      }
    },
    [editingPersona, createMutation, updateMutation],
  );

  const handleDelete = useCallback(
    (id: string) => {
      setDeletingId(id);
      deleteMutation.mutate(
        { id },
        { onSettled: () => setDeletingId(null) },
      );
    },
    [deleteMutation],
  );

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  if (isLoading) {
    return (
      <div className="page-container-narrow">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="page-eyebrow">Voice Identity</p>
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
        deletingId={deletingId}
        onSearch={handleSearch}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <PersonaFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        editingPersona={editingPersona}
      />
    </>
  );
}
