import { Cross2Icon, FileTextIcon, UploadIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { useState, useCallback, type ChangeEvent } from 'react';
import { toast } from 'sonner';

const SUPPORTED_TYPES = [
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const SUPPORTED_EXTENSIONS = '.txt,.pdf,.docx,.pptx';

interface DocumentUploaderProps {
  onUpload: (file: File, title: string | undefined) => void;
  isUploading: boolean;
}

export function DocumentUploader({
  onUpload,
  isUploading,
}: DocumentUploaderProps) {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);

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

  const handleUpload = () => {
    if (!uploadFile) return;
    onUpload(uploadFile, uploadTitle || undefined);
  };

  const handleClearFile = useCallback(() => {
    setUploadFile(null);
    setUploadTitle('');
  }, []);

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files?.[0] ?? null);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleUploadZoneClick = useCallback(() => {
    document.getElementById('doc-manager-file-input')?.click();
  }, []);

  const handleTitleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setUploadTitle(e.target.value);
  }, []);

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
            onClick={handleClearFile}
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
            onChange={handleTitleChange}
            placeholder="Document title"
            className="setup-input"
          />
        </div>

        <Button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              Uploading...
            </>
          ) : (
            <>
              <UploadIcon className="w-4 h-4 mr-2" />
              Upload & Add
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleUploadZoneClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleUploadZoneClick();
        }
      }}
      className={`setup-upload-zone ${isDragging ? 'dragging' : ''}`}
    >
      <input
        id="doc-manager-file-input"
        type="file"
        accept={SUPPORTED_EXTENSIONS}
        className="hidden"
        onChange={handleFileInputChange}
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
