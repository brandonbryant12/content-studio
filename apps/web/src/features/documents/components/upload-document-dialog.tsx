// Presenter: Upload dialog UI with hooks extracted

import { UploadIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { Spinner } from '@repo/ui/components/spinner';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  useOptimisticUpload,
  fileToBase64,
} from '../hooks/use-optimistic-upload';

const SUPPORTED_TYPES = [
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const SUPPORTED_EXTENSIONS = '.txt,.pdf,.docx,.pptx';

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
}: UploadDocumentDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleClose = useCallback(() => {
    setFile(null);
    setTitle('');
    onOpenChange(false);
  }, [onOpenChange]);

  const uploadMutation = useOptimisticUpload({ onSuccess: handleClose });

  const handleFileSelect = useCallback((selectedFile: File | null) => {
    if (!selectedFile) return;

    if (!SUPPORTED_TYPES.includes(selectedFile.type)) {
      toast.error(
        'Unsupported file type. Please upload TXT, PDF, DOCX, or PPTX.',
      );
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    setFile(selectedFile);
    // Auto-fill title from filename (without extension)
    const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
    setTitle(nameWithoutExt.replace(/[-_]/g, ' '));
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

  const handleSubmit = async () => {
    if (!file) return;

    const base64 = await fileToBase64(file);

    uploadMutation.mutate({
      fileName: file.name,
      mimeType: file.type,
      data: base64,
      title: title || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document to use for podcast generation. Supports TXT, PDF,
            DOCX, and PPTX.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
              ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}
              ${file ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''}
            `}
            onClick={() => document.getElementById('file-input')?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                document.getElementById('file-input')?.click();
              }
            }}
            aria-label="Drop zone for file upload. Click or press Enter to select a file."
          >
            <input
              id="file-input"
              type="file"
              accept={SUPPORTED_EXTENSIONS}
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div>
                <p className="font-medium text-green-600 dark:text-green-400">
                  {file.name}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <UploadIcon
                  className="w-8 h-8 mx-auto text-muted-foreground mb-2"
                  aria-hidden="true"
                />
                <p className="text-muted-foreground">
                  Drag and drop or click to select
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Max 10MB
                </p>
              </div>
            )}
          </div>

          {/* Title input */}
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title…"
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!file || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Uploading...
              </>
            ) : (
              'Upload'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
