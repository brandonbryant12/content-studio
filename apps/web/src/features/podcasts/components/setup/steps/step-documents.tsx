import {
  FileTextIcon,
  UploadIcon,
  GlobeIcon,
  Cross2Icon,
  CheckIcon,
  CheckCircledIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import { DocumentStatus } from '@repo/api/contracts';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@repo/ui/components/tabs';
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
} from '@/features/documents/hooks';
import { getErrorMessage } from '@/shared/lib/errors';
import { fileToBase64 } from '@/shared/lib/file-base64';

type DocumentItem = {
  id: string;
  title: string;
  source: string;
  mimeType: string;
  wordCount: number;
  status: string;
};

const SOURCE_BADGE_BY_TYPE = {
  url: 'URL',
  research: 'RES',
  manual: 'TXT',
} as const;

const STEP_DOCUMENT_TABS = [
  { key: 'existing', label: 'Select Existing' },
  { key: 'upload', label: 'Upload New' },
  { key: 'url', label: 'From URL' },
  { key: 'research', label: 'Research New' },
] as const;

type StepDocumentsTab = (typeof STEP_DOCUMENT_TABS)[number]['key'];

function getDocumentSourceBadge(doc: DocumentItem): string {
  if (doc.source in SOURCE_BADGE_BY_TYPE) {
    return SOURCE_BADGE_BY_TYPE[
      doc.source as keyof typeof SOURCE_BADGE_BY_TYPE
    ];
  }

  const subtype = doc.mimeType.split('/')[1];
  return subtype?.toUpperCase().slice(0, 3) || 'DOC';
}

function ExistingDocumentsPanel({
  documents,
  loadingDocs,
  isError,
  filteredDocuments,
  selectedIds,
  searchQuery,
  onSearchQueryChange,
  onToggleDocument,
  onSwitchToUpload,
}: {
  documents: readonly DocumentItem[] | null;
  loadingDocs: boolean;
  isError: boolean;
  filteredDocuments: readonly DocumentItem[];
  selectedIds: string[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onToggleDocument: (docId: string) => void;
  onSwitchToUpload: () => void;
}) {
  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
        <p className="text-sm font-medium text-destructive">
          Failed to load documents
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Please try again later or switch to another tab to upload directly.
        </p>
      </div>
    );
  }

  if (loadingDocs) {
    return (
      <div className="loading-center">
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="setup-doc-empty">
        <div className="setup-doc-empty-icon">
          <FileTextIcon />
        </div>
        <p className="setup-doc-empty-title">No documents yet</p>
        <p className="setup-doc-empty-description">
          Upload your first document to get started.
        </p>
        <Button variant="outline" onClick={onSwitchToUpload} className="mt-4">
          <UploadIcon className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="relative mb-4">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
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
              onClick={() => onToggleDocument(doc.id)}
              className={`setup-doc-item ${selectedIds.includes(doc.id) ? 'selected' : ''}`}
            >
              <div className="setup-doc-icon">
                <span>{getDocumentSourceBadge(doc)}</span>
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
  );
}

function UploadPanel({
  uploadFile,
  uploadTitle,
  onUploadTitleChange,
  onClearFile,
  onUpload,
  isUploading,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFilePick,
  fileInputRef,
  onFileSelect,
}: {
  uploadFile: File | null;
  uploadTitle: string;
  onUploadTitleChange: (title: string) => void;
  onClearFile: () => void;
  onUpload: () => void;
  isUploading: boolean;
  isDragging: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFilePick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (file: File | null) => void;
}) {
  if (uploadFile) {
    return (
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
            onClick={onClearFile}
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
            onChange={(e) => onUploadTitleChange(e.target.value)}
            placeholder="Document title"
            className="setup-input"
          />
        </div>

        <Button onClick={onUpload} disabled={isUploading} className="w-full">
          {isUploading ? (
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
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onFilePick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onFilePick();
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
        onChange={(e) => onFileSelect(e.target.files?.[0] ?? null)}
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
  );
}

function UrlPanel({
  url,
  title,
  onUrlChange,
  onTitleChange,
  onSubmit,
  isSubmitting,
}: {
  url: string;
  title: string;
  onUrlChange: (url: string) => void;
  onTitleChange: (title: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="setup-field">
        <label htmlFor="doc-url" className="setup-label">
          URL
        </label>
        <input
          id="doc-url"
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://example.com/article"
          className="setup-input"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="setup-field">
        <label htmlFor="doc-url-title" className="setup-label">
          Title{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          id="doc-url-title"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Auto-detected from page"
          className="setup-input"
          disabled={isSubmitting}
        />
      </div>

      <Button
        type="submit"
        disabled={!url.trim() || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? (
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
  );
}

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
  const [activeTab, setActiveTab] = useState<StepDocumentsTab>('existing');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const selectedIdsRef = useRef(selectedIds);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    data: documents,
    isLoading: loadingDocs,
    isError: docsError,
  } = useDocuments();

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  // Filter documents: only show ready ones, then apply search
  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    const ready = documents.filter(
      (doc) => doc.status === DocumentStatus.READY,
    );
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

  const fromUrlMutation = useMutation(
    apiClient.documents.fromUrl.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Failed to add URL'));
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

  const handleDocumentCreated = useCallback(
    (documentId: string, onCreated?: () => void) => {
      queryClient.invalidateQueries({
        queryKey: getDocumentListQueryKey(),
      });

      const currentSelectedIds = selectedIdsRef.current;
      onSelectionChange(
        currentSelectedIds.includes(documentId)
          ? currentSelectedIds
          : [...currentSelectedIds, documentId],
      );

      onCreated?.();
      setActiveTab('existing');
    },
    [queryClient, onSelectionChange],
  );

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

    const base64 = await fileToBase64(uploadFile);

    uploadMutation.mutate(
      {
        fileName: uploadFile.name,
        mimeType: uploadFile.type,
        data: base64,
        title: uploadTitle || undefined,
      },
      {
        onSuccess: (data) => {
          toast.success('Document uploaded');
          handleDocumentCreated(data.id, () => {
            setUploadFile(null);
            setUploadTitle('');
          });
        },
      },
    );
  };

  const handleCreateFromUrl = () => {
    const url = urlInput.trim();
    if (!url) return;

    fromUrlMutation.mutate(
      {
        url,
        title: urlTitle.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          toast.success('URL added — content is being processed');
          handleDocumentCreated(data.id, () => {
            setUrlInput('');
            setUrlTitle('');
          });
        },
      },
    );
  };

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const clearUploadFile = useCallback(() => {
    setUploadFile(null);
    setUploadTitle('');
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
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as StepDocumentsTab)}
      >
        <TabsList className="setup-tabs" aria-label="Document source">
          {STEP_DOCUMENT_TABS.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className={`setup-tab ${activeTab === tab.key ? 'active' : ''}`}
            >
              {tab.label}
              {tab.key === 'research' && researchDocId && (
                <CheckCircledIcon className="w-3.5 h-3.5 ml-1.5 text-emerald-600 dark:text-emerald-400 inline-block" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="existing">
          <ExistingDocumentsPanel
            documents={documents ?? null}
            loadingDocs={loadingDocs}
            isError={docsError}
            filteredDocuments={filteredDocuments}
            selectedIds={selectedIds}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onToggleDocument={toggleDocument}
            onSwitchToUpload={() => setActiveTab('upload')}
          />
        </TabsContent>

        <TabsContent value="upload">
          <UploadPanel
            uploadFile={uploadFile}
            uploadTitle={uploadTitle}
            onUploadTitleChange={setUploadTitle}
            onClearFile={clearUploadFile}
            onUpload={handleUpload}
            isUploading={uploadMutation.isPending}
            isDragging={isDragging}
            onDragOver={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onFilePick={openFilePicker}
            fileInputRef={fileInputRef}
            onFileSelect={handleFileSelect}
          />
        </TabsContent>

        <TabsContent value="url">
          <UrlPanel
            url={urlInput}
            title={urlTitle}
            onUrlChange={setUrlInput}
            onTitleChange={setUrlTitle}
            onSubmit={handleCreateFromUrl}
            isSubmitting={fromUrlMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="research">
          <StepResearch
            onDocumentCreated={onDocumentCreated}
            createdDocumentId={researchDocId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
