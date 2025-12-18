import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { Textarea } from '@repo/ui/components/textarea';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';
import { BaseDialog } from '@/components/base-dialog';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Document = RouterOutput['documents']['list'][number];

function DocumentPicker({
  documents,
  selectedIds,
  onSelect,
}: {
  documents: Document[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
}) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4 text-center">
        No documents available. Please upload documents first.
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2 dark:border-gray-700">
      {documents.map((doc) => (
        <label
          key={doc.id}
          className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
            selectedIds.has(doc.id) ? 'bg-violet-50 dark:bg-violet-900/20' : ''
          }`}
        >
          <input
            type="checkbox"
            checked={selectedIds.has(doc.id)}
            onChange={() => onSelect(doc.id)}
            className="rounded"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{doc.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {doc.wordCount.toLocaleString()} words
            </p>
          </div>
        </label>
      ))}
    </div>
  );
}

export default function CreateProjectDialog({
  open,
  onOpenChange,
}: CreateProjectDialogProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  const { data: documents } = useQuery(
    apiClient.documents.list.queryOptions({ input: {} }),
  );

  const createMutation = useMutation(
    apiClient.projects.create.mutationOptions({
      onSuccess: async (data) => {
        toast.success('Project created');
        onOpenChange(false);
        navigate({
          to: '/projects/$projectId',
          params: { projectId: data.id },
        });
        await invalidateQueries('projects');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to create project');
      },
    }),
  );

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset form state when dialog opens
      setTitle('');
      setDescription('');
      setSelectedDocIds(new Set());
    }
    onOpenChange(newOpen);
  };

  const toggleDocument = (id: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error('Please enter a project title');
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      documentIds: Array.from(selectedDocIds),
    });
  };

  return (
    <BaseDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Create Project"
      description="Create a new project to bundle documents and media together."
      footer={{
        submitText: 'Create Project',
        loadingText: 'Creating...',
        submitDisabled: !title.trim(),
        onSubmit: handleSubmit,
        isLoading: createMutation.isPending,
      }}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Project title..."
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this project is about..."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Documents (optional)</Label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Select documents to include in this project. You can add more
            later.
          </p>
          <DocumentPicker
            documents={documents ?? []}
            selectedIds={selectedDocIds}
            onSelect={toggleDocument}
          />
          {selectedDocIds.size > 0 && (
            <p className="text-xs text-violet-600 dark:text-violet-400">
              {selectedDocIds.size} document
              {selectedDocIds.size === 1 ? '' : 's'} selected
            </p>
          )}
        </div>
      </div>
    </BaseDialog>
  );
}
