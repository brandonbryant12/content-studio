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
import { Textarea } from '@repo/ui/components/textarea';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import Spinner from '@/routes/-components/common/spinner';

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
        await queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) && query.queryKey[0] === 'projects',
        });
        toast.success('Project created');
        onOpenChange(false);
        navigate({
          to: '/projects/$projectId',
          params: { projectId: data.id },
        });
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to create project');
      },
    }),
  );

  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setSelectedDocIds(new Set());
    }
  }, [open]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Create a new project to bundle documents and media together.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || !title.trim()}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white"
          >
            {createMutation.isPending ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Creating...
              </>
            ) : (
              'Create Project'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
