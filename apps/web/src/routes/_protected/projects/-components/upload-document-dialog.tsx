import { UploadIcon } from '@radix-ui/react-icons';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';
import { BaseDialog } from '@/components/base-dialog';

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
  projectId: string;
}

export default function UploadDocumentDialog({
  open,
  onOpenChange,
  projectId,
}: UploadDocumentDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const addDocumentMutation = useMutation(
    apiClient.projects.addDocument.mutationOptions({
      onError: (error) => {
        toast.error(error.message ?? 'Failed to add document to project');
      },
    }),
  );

  const uploadMutation = useMutation(
    apiClient.documents.upload.mutationOptions({
      onSuccess: async (document) => {
        await addDocumentMutation.mutateAsync({
          id: projectId,
          documentId: document.id,
        });

        await invalidateQueries('documents', 'projects');
        toast.success('Document uploaded and added to project');
        handleClose();
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to upload document');
      },
    }),
  );

  const handleClose = useCallback(() => {
    setFile(null);
    setTitle('');
    onOpenChange(false);
  }, [onOpenChange]);

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
      title: title || undefined,
    });
  };

  const isUploading = uploadMutation.isPending || addDocumentMutation.isPending;

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Upload Document"
      description="Upload a document to this project. Supports TXT, PDF, DOCX, and PPTX."
      maxWidth="md"
      footer={{
        submitText: 'Upload',
        loadingText: 'Uploading...',
        submitDisabled: !file,
        onSubmit: handleSubmit,
        isLoading: isUploading,
      }}
    >
      <div className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            ${isDragging ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-gray-300 dark:border-gray-700'}
            ${file ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''}
          `}
          onClick={() =>
            document.getElementById('project-file-input')?.click()
          }
        >
          <input
            id="project-file-input"
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
              <p className="text-sm text-gray-500 mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div>
              <UploadIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600 dark:text-gray-400">
                Drag and drop or click to select
              </p>
              <p className="text-sm text-gray-400 mt-1">Max 10MB</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="doc-title">Title (optional)</Label>
          <Input
            id="doc-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title"
          />
        </div>
      </div>
    </BaseDialog>
  );
}
