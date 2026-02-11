// features/documents/components/document-detail-container.tsx
// Container: Fetches document + content, manages state, coordinates actions

import { useState } from 'react';
import { useDocument, useDocumentContent } from '../hooks/use-document';
import { useDocumentActions } from '../hooks/use-document-actions';
import { useDocumentSearch } from '../hooks/use-document-search';
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
  const { data: contentData } = useDocumentContent(documentId);

  const actions = useDocumentActions({ document });
  const search = useDocumentSearch(contentData.content);

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

  return (
    <>
      <DocumentDetail
        document={document}
        content={contentData.content}
        title={actions.title}
        onTitleChange={actions.setTitle}
        hasChanges={actions.hasChanges}
        isSaving={actions.isSaving}
        isDeleting={actions.isDeleting}
        onSave={actions.handleSave}
        onDiscard={actions.discardChanges}
        onDeleteRequest={() => setIsDeleteDialogOpen(true)}
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
