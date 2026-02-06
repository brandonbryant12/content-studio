// features/documents/components/document-list-container.tsx
// Container: Handles data fetching, state management, and mutations

import { useState, useCallback } from 'react';
import { useDocumentList } from '../hooks/use-document-list';
import { useOptimisticDeleteDocument } from '../hooks/use-optimistic-delete-document';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { DocumentList } from './document-list';

/**
 * Container: Fetches document list and coordinates mutations.
 * Manages search state and upload dialog locally.
 */
export function DocumentListContainer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Data fetching
  const { data: documents = [], isLoading } = useDocumentList();

  // Mutations
  const deleteMutation = useOptimisticDeleteDocument();

  const handleDeleteRequest = useCallback((id: string) => {
    setPendingDeleteId(id);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    setDeletingId(id);
    deleteMutation.mutate(
      { id },
      {
        onSettled: () => {
          setDeletingId(null);
        },
      },
    );
  }, [pendingDeleteId, deleteMutation]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleUploadOpen = useCallback((open: boolean) => {
    setUploadOpen(open);
  }, []);

  // Show loading state while initially fetching
  if (isLoading) {
    return (
      <div className="page-container-narrow">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="page-eyebrow">Source Content</p>
            <h1 className="page-title">Documents</h1>
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
      <DocumentList
        documents={documents}
        searchQuery={searchQuery}
        uploadOpen={uploadOpen}
        deletingId={deletingId}
        onSearch={handleSearch}
        onUploadOpen={handleUploadOpen}
        onDelete={handleDeleteRequest}
      />
      <ConfirmationDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
