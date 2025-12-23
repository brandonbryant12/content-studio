import {
  FileTextIcon,
  UploadIcon,
  Cross2Icon,
  CheckIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';

const SUPPORTED_TYPES = [
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const SUPPORTED_EXTENSIONS = '.txt,.pdf,.docx,.pptx';

interface StepDocumentsProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function StepDocuments({
  selectedIds,
  onSelectionChange,
}: StepDocumentsProps) {
  const [activeTab, setActiveTab] = useState<'existing' | 'upload'>('existing');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const { data: documents, isPending: loadingDocs } = useQuery(
    apiClient.documents.list.queryOptions({ input: {} }),
  );

  const uploadMutation = useMutation(
    apiClient.documents.upload.mutationOptions({
      onSuccess: async (data) => {
        toast.success('Document uploaded');
        // Auto-select the newly uploaded document
        onSelectionChange([...selectedIds, data.id]);
        setUploadFile(null);
        setUploadTitle('');
        setActiveTab('existing');
        await invalidateQueries('documents');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to upload document');
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

  return (
    <div className="setup-content">
      <div className="setup-step-header">
        <p className="setup-step-eyebrow">Step 2 of 4</p>
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
      <div className="setup-tabs">
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
        // Existing documents tab
        loadingDocs ? (
          <div className="loading-center">
            <Spinner className="w-6 h-6" />
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="setup-doc-grid">
            {documents.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => toggleDocument(doc.id)}
                className={`setup-doc-item ${selectedIds.includes(doc.id) ? 'selected' : ''}`}
              >
                <div className="setup-doc-icon">
                  <span>
                    {doc.mimeType.split('/')[1]?.toUpperCase().slice(0, 3) ||
                      'DOC'}
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
        )
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
              onClick={() =>
                document.getElementById('setup-file-input')?.click()
              }
              className={`setup-upload-zone ${isDragging ? 'dragging' : ''}`}
            >
              <input
                id="setup-file-input"
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
      )}
    </div>
  );
}
