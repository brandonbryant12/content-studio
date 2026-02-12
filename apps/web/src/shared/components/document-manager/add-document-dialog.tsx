import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { DocumentInfo } from '@/shared/hooks/use-document-selection';
import { DocumentUploader } from './document-uploader';
import { ExistingDocumentPicker } from './existing-document-picker';
import { apiClient } from '@/clients/apiClient';
import {
  useDocuments,
  getDocumentListQueryKey,
} from '@/features/documents/hooks/use-document-list';
import { BaseDialog } from '@/shared/components/base-dialog';
import { getErrorMessage } from '@/shared/lib/errors';

interface AddDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDocumentIds: string[];
  onAddDocuments: (docs: DocumentInfo[]) => void;
}

export function AddDocumentDialog({
  open,
  onOpenChange,
  currentDocumentIds,
  onAddDocuments,
}: AddDocumentDialogProps) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'existing' | 'upload'>('existing');

  const { data: allDocuments, isLoading: loadingDocs } = useDocuments({
    enabled: open,
  });

  const uploadMutation = useMutation(
    apiClient.documents.upload.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getDocumentListQueryKey() });
        toast.success('Document uploaded');
        onAddDocuments([data]);
        handleClose();
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to upload document'));
      },
    }),
  );

  const availableDocuments = allDocuments?.filter(
    (doc) => !currentDocumentIds.includes(doc.id),
  );

  const handleAddDocuments = () => {
    if (selectedIds.length === 0) return;
    const docsToAdd =
      allDocuments?.filter((d) => selectedIds.includes(d.id)) ?? [];
    onAddDocuments(docsToAdd);
    handleClose();
  };

  const toggleDocument = useCallback((docId: string) => {
    setSelectedIds((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId],
    );
  }, []);

  const handleClose = () => {
    onOpenChange(false);
    setSelectedIds([]);
    setActiveTab('existing');
  };

  const handleUpload = useCallback(
    async (file: File, title: string | undefined) => {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          '',
        ),
      );

      uploadMutation.mutate({
        fileName: file.name,
        mimeType: file.type,
        data: base64,
        title,
      });
    },
    [uploadMutation],
  );

  return (
    <BaseDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
        else onOpenChange(isOpen);
      }}
      title="Add Documents"
      description="Select existing documents or upload new ones."
      maxWidth="lg"
      scrollable
      footer={
        activeTab === 'existing'
          ? {
              submitText: `Add ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''}`,
              loadingText: 'Adding\u2026',
              submitDisabled: selectedIds.length === 0,
              onSubmit: handleAddDocuments,
              isLoading: false,
            }
          : undefined
      }
    >
      <div className="setup-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'existing'}
          onClick={() => setActiveTab('existing')}
          className={`setup-tab ${activeTab === 'existing' ? 'active' : ''}`}
        >
          Select Existing
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'upload'}
          onClick={() => setActiveTab('upload')}
          className={`setup-tab ${activeTab === 'upload' ? 'active' : ''}`}
        >
          Upload New
        </button>
      </div>

      {activeTab === 'existing' ? (
        <ExistingDocumentPicker
          availableDocuments={availableDocuments}
          isLoading={loadingDocs}
          selectedIds={selectedIds}
          onToggleDocument={toggleDocument}
          onSwitchToUpload={() => setActiveTab('upload')}
        />
      ) : (
        <DocumentUploader
          onUpload={handleUpload}
          isUploading={uploadMutation.isPending}
        />
      )}
    </BaseDialog>
  );
}
