import { useState } from 'react';
import { toast } from 'sonner';
import type { DocumentInfo } from '@/shared/hooks/use-document-selection';
import { AddDocumentDialog } from '@/shared/components/document-manager';
import { DocumentList } from '@/shared/components/document-manager';

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

  const handleRemove = (docId: string) => {
    if (documents.length <= 1) {
      toast.error('Podcast must have at least one document');
      return;
    }
    onRemoveDocument(docId);
  };

  const currentIds = documents.map((d) => d.id);

  return (
    <>
      <DocumentList
        documents={documents}
        disabled={disabled}
        onRemove={handleRemove}
        onAdd={() => setAddDialogOpen(true)}
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
