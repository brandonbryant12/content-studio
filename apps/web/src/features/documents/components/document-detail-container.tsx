// Container: Fetches document + content, manages state, coordinates actions

import { useState, useCallback } from 'react';
import { useDocument, useDocumentContentOptional } from '../hooks/use-document';
import { useDocumentActions } from '../hooks/use-document-actions';
import { useDocumentSearch } from '../hooks/use-document-search';
import { useRetryProcessing } from '../hooks/use-retry-processing';
import { DocumentDetail } from './document-detail';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { useKeyboardShortcut, useNavigationBlock } from '@/shared/hooks';

interface DocumentDetailContainerProps {
  documentId: string;
}

export function DocumentDetailContainer({
  documentId,
}: DocumentDetailContainerProps) {
  const { data: document } = useDocument(documentId);

  // Only fetch content when document is ready (hook always called, `enabled` controls fetching)
  const isReady = document.status === 'ready';
  const { data: contentData } = useDocumentContentOptional(documentId, isReady);

  const actions = useDocumentActions({ document });
  const search = useDocumentSearch(contentData?.content ?? '');
  const retryMutation = useRetryProcessing();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useKeyboardShortcut({
    key: 's',
    cmdOrCtrl: true,
    onTrigger: actions.handleSave,
    enabled: actions.hasChanges,
  });

  useKeyboardShortcut({
    key: 'f',
    cmdOrCtrl: true,
    onTrigger: search.open,
  });

  useNavigationBlock({
    shouldBlock: actions.hasChanges,
  });

  const handleRetry = useCallback(() => {
    retryMutation.mutate({ id: documentId });
  }, [retryMutation, documentId]);

  const handleDeleteRequest = useCallback(() => {
    setIsDeleteDialogOpen(true);
  }, []);

  return (
    <>
      <DocumentDetail
        document={document}
        content={contentData?.content ?? null}
        title={actions.title}
        onTitleChange={actions.setTitle}
        hasChanges={actions.hasChanges}
        isSaving={actions.isSaving}
        isDeleting={actions.isDeleting}
        isRetrying={retryMutation.isPending}
        onSave={actions.handleSave}
        onDiscard={actions.discardChanges}
        onDeleteRequest={handleDeleteRequest}
        onRetry={handleRetry}
        search={search}
      />
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone. Any podcasts or voiceovers using this document will not be affected."
        confirmText="Delete"
        variant="destructive"
        isLoading={actions.isDeleting}
        onConfirm={actions.handleDelete}
      />
    </>
  );
}
