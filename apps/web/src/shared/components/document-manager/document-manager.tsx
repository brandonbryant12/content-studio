import { useState, useCallback, useMemo } from 'react';
import type { DocumentInfo } from '@/shared/hooks/use-document-selection';
import { AddDocumentDialog } from './add-document-dialog';
import { DocumentList } from './document-list';

interface DocumentManagerProps {
  documents: DocumentInfo[];
  onAddDocuments: (docs: DocumentInfo[]) => void;
  onRemoveDocument: (docId: string) => void;
  disabled?: boolean;
}

export function DocumentManager({
  documents,
  onAddDocuments,
  onRemoveDocument,
  disabled,
}: DocumentManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const handleOpenAddDialog = useCallback(() => {
    setAddDialogOpen(true);
  }, []);

  const currentIds = useMemo(() => documents.map((d) => d.id), [documents]);

  return (
    <>
      <DocumentList
        documents={documents}
        disabled={disabled}
        onRemove={onRemoveDocument}
        onAdd={handleOpenAddDialog}
      />

      <AddDocumentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        currentDocumentIds={currentIds}
        onAddDocuments={onAddDocuments}
      />
    </>
  );
}
