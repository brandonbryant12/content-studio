import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

type Document = RouterOutput['documents']['get'];

export interface UseDocumentActionsReturn {
  /** Current edited title */
  title: string;
  /** Update the local title */
  setTitle: (title: string) => void;
  /** Whether the title has been changed from the server value */
  hasChanges: boolean;
  /** Whether the update mutation is in flight */
  isSaving: boolean;
  /** Whether the delete mutation is in flight */
  isDeleting: boolean;
  /** Save the title change */
  handleSave: () => void;
  /** Delete the document (requires confirmation first) */
  handleDelete: () => void;
  /** Discard local title changes */
  discardChanges: () => void;
}

interface UseDocumentActionsOptions {
  document: Document;
}

export function useDocumentActions({
  document,
}: UseDocumentActionsOptions): UseDocumentActionsReturn {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitleInternal] = useState(document.title);
  const hasUserEdits = useRef(false);

  const setTitle = useCallback((value: string) => {
    hasUserEdits.current = true;
    setTitleInternal(value);
  }, []);

  // Sync from server when title changes externally (SSE/cache invalidation)
  useEffect(() => {
    if (!hasUserEdits.current) {
      setTitleInternal(document.title);
    }
  }, [document.title]);

  const hasChanges = title.trim() !== document.title;

  const updateMutation = useMutation(
    apiClient.documents.update.mutationOptions({
      onSuccess: (updated) => {
        toast.success('Document updated');
        hasUserEdits.current = false;
        setTitleInternal(updated.title);
        // Update the single-document cache
        queryClient.setQueryData(
          apiClient.documents.get.queryOptions({ input: { id: document.id } })
            .queryKey,
          updated,
        );
        // Invalidate the list so it reflects the new title
        queryClient.invalidateQueries({
          queryKey: apiClient.documents.list.queryOptions({ input: {} })
            .queryKey,
        });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to update document'));
      },
    }),
  );

  const deleteMutation = useMutation(
    apiClient.documents.delete.mutationOptions({
      onSuccess: () => {
        toast.success('Document deleted');
        navigate({ to: '/documents' });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to delete document'));
      },
    }),
  );

  const handleSave = useCallback(() => {
    if (!hasChanges || updateMutation.isPending) return;
    updateMutation.mutate({ id: document.id, title: title.trim() });
  }, [hasChanges, updateMutation, document.id, title]);

  const handleDelete = useCallback(() => {
    deleteMutation.mutate({ id: document.id });
  }, [deleteMutation, document.id]);

  const discardChanges = useCallback(() => {
    hasUserEdits.current = false;
    setTitleInternal(document.title);
  }, [document.title]);

  return {
    title,
    setTitle,
    hasChanges,
    isSaving: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    handleSave,
    handleDelete,
    discardChanges,
  };
}
