import {
  FileTextIcon,
  UploadIcon,
  Cross2Icon,
  CheckIcon,
  CheckCircledIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
  SUPPORTED_TYPES,
  SUPPORTED_EXTENSIONS,
} from '../../../lib/upload-constants';
import { StepResearch } from './step-research';
import { apiClient } from '@/clients/apiClient';
import {
  useDocuments,
  getDocumentListQueryKey,
} from '@/features/documents/hooks/use-document-list';
import { getErrorMessage } from '@/shared/lib/errors';

interface StepDocumentsProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  researchDocId: string | null;
  onDocumentCreated: (id: string, title: string) => void;
}

export function StepDocuments({
  selectedIds,
  onSelectionChange,
  researchDocId,
  onDocumentCreated,
}: StepDocumentsProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    'existing' | 'upload' | 'research'
  >('existing');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const selectedIdsRef = useRef(selectedIds);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: documents, isLoading: loadingDocs } = useDocuments();

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  // Filter documents: only show ready ones, then apply search
  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    const ready = documents.filter((doc) => doc.status === 'ready');
    if (!searchQuery.trim()) return ready;
    const query = searchQuery.toLowerCase();
    return ready.filter((doc) => doc.title.toLowerCase().includes(query));
  }, [documents, searchQuery]);

  const uploadMutation = useMutation(
    apiClient.documents.upload.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to upload document'));
      },
    }),
  );

  const toggleDocument = (docId: string) => {
    onSelectionChange(
      selectedIds.includes(docId)
        ? selectedIds.filter((id) => id !== docId)
        : [...selectedIds, docId],
    );
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

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]!);
      reader.onerror = reject;
      reader.readAsDataURL(uploadFile);
    });

    uploadMutation.mutate(
      {
        fileName: uploadFile.name,
        mimeType: uploadFile.type,
        data: base64,
        title: uploadTitle || undefined,
      },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({
            queryKey: getDocumentListQueryKey(),
          });
          toast.success('Document uploaded');
          const currentSelectedIds = selectedIdsRef.current;
          onSelectionChange(
            currentSelectedIds.includes(data.id)
              ? currentSelectedIds
              : [...currentSelectedIds, data.id],
          );
          setUploadFile(null);
          setUploadTitle('');
          setActiveTab('existing');
        },
      },
    );
  };

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="setup-content">
      <div className="setup-step-header">
        <p className="setup-step-eyebrow">Step 1 of 3</p>
        <h2 className="setup-step-title">Add Source Documents</h2>
        <p className="setup-step-description">
          Select existing documents or upload new ones. Your podcast will be
          generated from these sources.
        </p>
      </div>

      {/* Selection counter */}
      {selectedIds.length > 0 && (
        <div className="flex justify-center mb-6">
          <span className="setup-selection-counter">
            <CheckIcon className="w-4 h-4" />
            {selectedIds.length} document{selectedIds.length !== 1 ? 's' : ''}{' '}
            selected
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="setup-tabs" role="tablist" aria-label="Document source">
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
          aria-selected={activeTab === 'research'}
          onClick={() => setActiveTab('research')}
          className={`setup-tab ${activeTab === 'research' ? 'active' : ''}`}
        >
          Research New
          {researchDocId && (
            <CheckCircledIcon className="w-3.5 h-3.5 ml-1.5 text-emerald-600 dark:text-emerald-400 inline-block" />
          )}
        </button>
      </div>

      {/* Existing documents tab */}
      <div hidden={activeTab !== 'existing'}>
        {loadingDocs ? (
          <div className="loading-center">
            <Spinner className="w-6 h-6" />
          </div>
        ) : documents && documents.length > 0 ? (
          <>
            {/* Search bar */}
            <div className="relative mb-4">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="setup-input pl-9"
                aria-label="Search documents"
              />
            </div>

            {filteredDocuments.length > 0 ? (
              <div className="setup-doc-grid">
                {filteredDocuments.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => toggleDocument(doc.id)}
                    className={`setup-doc-item ${selectedIds.includes(doc.id) ? 'selected' : ''}`}
                  >
                    <div className="setup-doc-icon">
                      <span>
                        {doc.source === 'url'
                          ? 'URL'
                          : doc.source === 'research'
                            ? 'RES'
                            : doc.source === 'manual'
                              ? 'TXT'
                              : doc.mimeType
                                  .split('/')[1]
                                  ?.toUpperCase()
                                  .slice(0, 3) || 'DOC'}
                      </span>
                    </div>
                    <div className="setup-doc-info">
                      <p className="setup-doc-title">{doc.title}</p>
                      <p className="setup-doc-meta">
                        {doc.wordCount.toLocaleString()} words
                      </p>
                    </div>
                    <div className="setup-doc-checkbox">
                      {selectedIds.includes(doc.id) && <CheckIcon />}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="setup-doc-empty">
                <div className="setup-doc-empty-icon">
                  <MagnifyingGlassIcon />
                </div>
                <p className="setup-doc-empty-title">No documents found</p>
                <p className="setup-doc-empty-description">
                  No documents match your search.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="setup-doc-empty">
            <div className="setup-doc-empty-icon">
              <FileTextIcon />
            </div>
            <p className="setup-doc-empty-title">No documents yet</p>
            <p className="setup-doc-empty-description">
              Upload your first document to get started.
            </p>
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
      </div>

      {/* Upload tab */}
      <div
        role="tabpanel"
        aria-label="Upload New"
        hidden={activeTab !== 'upload'}
      >
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
                  Upload Document
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
            onClick={openFilePicker}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openFilePicker();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Upload a document file. Supports TXT, PDF, DOCX, PPTX"
            className={`setup-upload-zone ${isDragging ? 'dragging' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={SUPPORTED_EXTENSIONS}
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
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

      {/* Research tab */}
      <div hidden={activeTab !== 'research'}>
        <StepResearch
          onDocumentCreated={onDocumentCreated}
          createdDocumentId={researchDocId}
        />
      </div>
    </div>
  );
}
