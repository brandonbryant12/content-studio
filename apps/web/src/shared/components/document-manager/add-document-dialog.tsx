import { GlobeIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
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
} from '@/features/documents/hooks';
import { BaseDialog } from '@/shared/components/base-dialog';
import { getErrorMessage } from '@/shared/lib/errors';
import { fileToBase64 } from '@/shared/lib/file-base64';

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
  const [activeTab, setActiveTab] = useState<'existing' | 'upload' | 'url'>(
    'existing',
  );
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');

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

  const fromUrlMutation = useMutation(
    apiClient.documents.fromUrl.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getDocumentListQueryKey() });
        toast.success('URL added — content is being processed');
        onAddDocuments([data]);
        handleClose();
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to add URL'));
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
    setUrlInput('');
    setUrlTitle('');
  };

  const handleUpload = useCallback(
    async (file: File, title: string | undefined) => {
      const base64 = await fileToBase64(file);

      uploadMutation.mutate({
        fileName: file.name,
        mimeType: file.type,
        data: base64,
        title,
      });
    },
    [uploadMutation],
  );

  const handleCreateFromUrl = useCallback(() => {
    const url = urlInput.trim();
    if (!url) return;

    fromUrlMutation.mutate({
      url,
      title: urlTitle.trim() || undefined,
    });
  }, [fromUrlMutation, urlInput, urlTitle]);

  return (
    <BaseDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
        else onOpenChange(isOpen);
      }}
      title="Add Documents"
      description="Select existing documents, upload new ones, or add from a URL."
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
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'url'}
          onClick={() => setActiveTab('url')}
          className={`setup-tab ${activeTab === 'url' ? 'active' : ''}`}
        >
          From URL
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
      ) : activeTab === 'upload' ? (
        <DocumentUploader
          onUpload={handleUpload}
          isUploading={uploadMutation.isPending}
        />
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateFromUrl();
          }}
        >
          <div className="setup-field">
            <label htmlFor="dialog-doc-url" className="setup-label">
              URL
            </label>
            <input
              id="dialog-doc-url"
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/article"
              className="setup-input"
              required
              disabled={fromUrlMutation.isPending}
              autoFocus
            />
          </div>

          <div className="setup-field">
            <label htmlFor="dialog-doc-url-title" className="setup-label">
              Title{' '}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </label>
            <input
              id="dialog-doc-url-title"
              type="text"
              value={urlTitle}
              onChange={(e) => setUrlTitle(e.target.value)}
              placeholder="Auto-detected from page"
              className="setup-input"
              disabled={fromUrlMutation.isPending}
            />
          </div>

          <Button
            type="submit"
            disabled={!urlInput.trim() || fromUrlMutation.isPending}
            className="w-full"
          >
            {fromUrlMutation.isPending ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Processing...
              </>
            ) : (
              <>
                <GlobeIcon className="w-4 h-4 mr-2" />
                Add URL
              </>
            )}
          </Button>
        </form>
      )}
    </BaseDialog>
  );
}
