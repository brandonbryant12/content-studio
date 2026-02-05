import { useState, useCallback } from 'react';
import { useAudienceSegments } from '../hooks/use-audience-segments';
import {
  useCreateAudienceSegment,
  useUpdateAudienceSegment,
  useDeleteAudienceSegment,
} from '../hooks/use-audience-segment-mutations';
import { AudienceList } from './audience-list';
import {
  AudienceFormDialog,
  type AudienceSegmentFormData,
} from './audience-form-dialog';
import type { AudienceSegmentListItem } from './audience-item';

/**
 * Container: Fetches audience segment list and coordinates mutations.
 */
export function AudienceListContainer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] =
    useState<AudienceSegmentListItem | null>(null);

  // Data fetching
  const { data: segments = [], isLoading } = useAudienceSegments();

  // Mutations
  const createMutation = useCreateAudienceSegment({
    onSuccess: () => setDialogOpen(false),
  });
  const updateMutation = useUpdateAudienceSegment({
    onSuccess: () => {
      setDialogOpen(false);
      setEditingSegment(null);
    },
  });
  const deleteMutation = useDeleteAudienceSegment();

  const handleCreate = useCallback(() => {
    setEditingSegment(null);
    setDialogOpen(true);
  }, []);

  const handleEdit = useCallback((segment: AudienceSegmentListItem) => {
    setEditingSegment(segment);
    setDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(
    (data: AudienceSegmentFormData) => {
      if (editingSegment) {
        updateMutation.mutate({
          id: editingSegment.id as Parameters<typeof updateMutation.mutate>[0]['id'],
          name: data.name,
          description: data.description ?? undefined,
          messagingTone: data.messagingTone ?? undefined,
          keyInterests: data.keyInterests ?? undefined,
        });
      } else {
        createMutation.mutate({
          name: data.name,
          description: data.description ?? undefined,
          messagingTone: data.messagingTone ?? undefined,
          keyInterests: data.keyInterests ?? undefined,
        });
      }
    },
    [editingSegment, createMutation, updateMutation],
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
            <p className="page-eyebrow">Target Listeners</p>
            <h1 className="page-title">Audiences</h1>
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
      <AudienceList
        segments={segments}
        searchQuery={searchQuery}
        deletingId={deletingId}
        onSearch={handleSearch}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <AudienceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        editingSegment={editingSegment}
      />
    </>
  );
}
