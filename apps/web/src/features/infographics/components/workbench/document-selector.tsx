// features/infographics/components/workbench/document-selector.tsx

import {
  PlusIcon,
  Cross2Icon,
  FileTextIcon,
  UploadIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { BaseDialog } from '@/shared/components/base-dialog';
import { useDocuments, getDocumentListQueryKey } from '@/features/documents';
import { apiClient } from '@/clients/apiClient';
import { getErrorMessage } from '@/shared/lib/errors';

const SUPPORTED_TYPES = [
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const SUPPORTED_EXTENSIONS = '.txt,.pdf,.docx,.pptx';

/** Document info returned when selecting documents */
export interface InfographicDocumentInfo {
  id: string;
  title: string;
  wordCount: number;
  mimeType: string;
}

export interface DocumentSelectorProps {
  /** Currently selected document IDs */
  selectedDocumentIds: string[];
  /** Callback when documents are added */
  onAddDocuments: (docs: InfographicDocumentInfo[]) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Trigger button variant - 'button' shows a full button, 'icon' shows just + icon */
  triggerVariant?: 'button' | 'icon';
}

/**
 * Document selector dialog for adding documents to infographic.
 * Allows selecting from existing documents or uploading new ones.
 */
export function DocumentSelector({
  selectedDocumentIds,
  onAddDocuments,
  disabled,
  triggerVariant = 'button',
}: DocumentSelectorProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'existing' | 'upload'>('existing');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Fetch all available documents when dialog is open
  const { data: allDocuments, isLoading: loadingDocs } = useDocuments({
    enabled: dialogOpen,
  });

  const uploadMutation = useMutation(
    apiClient.documents.upload.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getDocumentListQueryKey() });
        toast.success('Document uploaded');
        // Add the newly uploaded document
        onAddDocuments([
          {
            id: data.id,
            title: data.title,
            wordCount: data.wordCount,
            mimeType: data.mimeType,
          },
        ]);
        setUploadFile(null);
        setUploadTitle('');
        setDialogOpen(false);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to upload document'));
      },
    }),
  );

  // Filter out already-selected documents
  const availableDocuments = useMemo(
    () => allDocuments?.filter((doc) => !selectedDocumentIds.includes(doc.id)),
    [allDocuments, selectedDocumentIds],
  );

  // Filter documents by search query
  const filteredDocuments = useMemo(() => {
    if (!availableDocuments) return [];
    if (!searchQuery.trim()) return availableDocuments;
    const query = searchQuery.toLowerCase();
    return availableDocuments.filter((doc) =>
      doc.title.toLowerCase().includes(query),
    );
  }, [availableDocuments, searchQuery]);

  const toggleDocument = (docId: string) => {
    setSelectedIds((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId],
    );
  };

  const handleAddDocuments = () => {
    if (selectedIds.length === 0) return;

    // Find the full document info for selected IDs
    const docsToAdd =
      allDocuments
        ?.filter((d) => selectedIds.includes(d.id))
        .map((d) => ({
          id: d.id,
          title: d.title,
          wordCount: d.wordCount,
          mimeType: d.mimeType,
        })) ?? [];
    onAddDocuments(docsToAdd);
    setSelectedIds([]);
    setDialogOpen(false);
  };

  const handleFileSelect = useCallback((file: File | null) => {
    if (!file) return;

    if (!SUPPORTED_TYPES.includes(file.type)) {
      toast.error(
        'Unsupported file type. Please upload TXT, PDF, DOCX, or PPTX.',
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    setUploadFile(file);
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    setUploadTitle(nameWithoutExt.replace(/[-_]/g, ' '));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect],
  );

  const handleUpload = async () => {
    if (!uploadFile) return;

    const arrayBuffer = await uploadFile.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        '',
      ),
    );

    uploadMutation.mutate({
      fileName: uploadFile.name,
      mimeType: uploadFile.type,
      data: base64,
      title: uploadTitle || undefined,
    });
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      // Reset state when dialog closes
      setSelectedIds([]);
      setActiveTab('existing');
      setSearchQuery('');
      setUploadFile(null);
      setUploadTitle('');
    }
  };

  return (
    <>
      {triggerVariant === 'button' ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          disabled={disabled}
          className="gap-1.5"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Add Document
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDialogOpen(true)}
          disabled={disabled}
          aria-label="Add document"
        >
          <PlusIcon className="w-4 h-4" />
        </Button>
      )}

      <BaseDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        title="Add Documents"
        description="Select existing documents or upload new ones to include in your infographic."
        maxWidth="md"
        scrollable
        footer={
          activeTab === 'existing'
            ? {
                submitText: `Add ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''}`,
                loadingText: 'Adding...',
                submitDisabled: selectedIds.length === 0,
                onSubmit: handleAddDocuments,
                isLoading: false,
              }
            : undefined
        }
      >
        {/* Tabs */}
        <div className="setup-tabs mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('existing')}
            className={`setup-tab ${activeTab === 'existing' ? 'active' : ''}`}
          >
            Select Existing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`setup-tab ${activeTab === 'upload' ? 'active' : ''}`}
          >
            Upload New
          </button>
        </div>

        {activeTab === 'existing' ? (
          <>
            {/* Search bar */}
            {availableDocuments && availableDocuments.length > 0 && (
              <div className="relative mb-4">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="setup-input pl-9"
                />
              </div>
            )}

            {loadingDocs ? (
              <div className="loading-center">
                <Spinner className="w-5 h-5" />
              </div>
            ) : filteredDocuments.length > 0 ? (
              <div className="space-y-2">
                {filteredDocuments.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => toggleDocument(doc.id)}
                    className={`doc-picker-item ${selectedIds.includes(doc.id) ? 'selected' : ''}`}
                  >
                    <div className="doc-picker-item-icon">
                      <span>
                        {doc.mimeType
                          .split('/')[1]
                          ?.toUpperCase()
                          .slice(0, 3) || 'DOC'}
                      </span>
                    </div>
                    <div className="doc-picker-item-info">
                      <p className="doc-picker-item-title">{doc.title}</p>
                      <p className="doc-picker-item-meta">
                        {doc.wordCount.toLocaleString()} words
                      </p>
                    </div>
                    <div
                      className={`doc-picker-checkbox ${selectedIds.includes(doc.id) ? 'checked' : ''}`}
                    >
                      {selectedIds.includes(doc.id) && (
                        <svg
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="empty-state-lg">
                <div className="empty-state-icon">
                  <MagnifyingGlassIcon className="w-6 h-6" />
                </div>
                <p className="text-body">No documents match your search.</p>
              </div>
            ) : (
              <div className="empty-state-lg">
                <div className="empty-state-icon">
                  <FileTextIcon className="w-6 h-6" />
                </div>
                <p className="text-body">No more documents available to add.</p>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('upload')}
                  className="mt-4"
                >
                  <UploadIcon className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            )}
          </>
        ) : (
          // Upload tab
          <div>
            {uploadFile ? (
              <div className="space-y-4">
                <div className="setup-file-preview">
                  <div className="setup-file-icon">
                    <FileTextIcon />
                  </div>
                  <div className="setup-file-info">
                    <p className="setup-file-name">{uploadFile.name}</p>
                    <p className="setup-file-size">
                      {(uploadFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setUploadFile(null);
                      setUploadTitle('');
                    }}
                    className="setup-file-remove"
                    aria-label="Remove file"
                  >
                    <Cross2Icon className="w-4 h-4" />
                  </Button>
                </div>

                <div className="setup-field">
                  <label htmlFor="doc-title" className="setup-label">
                    Title{' '}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="doc-title"
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Document title"
                    className="setup-input"
                  />
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                  className="w-full"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <UploadIcon className="w-4 h-4 mr-2" />
                      Upload & Add to Infographic
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() =>
                  document.getElementById('infographic-file-input')?.click()
                }
                className={`setup-upload-zone ${isDragging ? 'dragging' : ''}`}
              >
                <input
                  id="infographic-file-input"
                  type="file"
                  accept={SUPPORTED_EXTENSIONS}
                  className="hidden"
                  onChange={(e) =>
                    handleFileSelect(e.target.files?.[0] ?? null)
                  }
                />
                <div className="setup-upload-icon">
                  <UploadIcon />
                </div>
                <p className="setup-upload-title">Drop your file here</p>
                <p className="setup-upload-hint">or click to browse</p>
                <p className="setup-upload-formats">
                  Supports TXT, PDF, DOCX, PPTX (max 10MB)
                </p>
              </div>
            )}
          </div>
        )}
      </BaseDialog>
    </>
  );
}
