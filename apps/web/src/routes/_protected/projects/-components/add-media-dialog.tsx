import { FileTextIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/dialog';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import type { RouterOutput } from '@repo/api/client';
import { apiClient } from '@/clients/apiClient';
import { queryClient } from '@/clients/queryClient';
import Spinner from '@/routes/-components/common/spinner';

interface AddMediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  existingMediaIds: string[];
}

type Document = RouterOutput['documents']['list'][number];

function DocumentItem({
  doc,
  selected,
  onToggle,
  disabled,
}: {
  doc: Document;
  selected: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        disabled
          ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900'
          : selected
            ? 'bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        disabled={disabled}
        className="rounded"
      />
      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
        <FileTextIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">
          {doc.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {doc.wordCount.toLocaleString()} words
          {disabled && ' (already added)'}
        </p>
      </div>
    </label>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <FileTextIcon className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No documents available. Upload documents first.
      </p>
    </div>
  );
}

export default function AddMediaDialog({
  open,
  onOpenChange,
  projectId,
  existingMediaIds,
}: AddMediaDialogProps) {
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  const { data: documents, isPending: loadingDocs } = useQuery(
    apiClient.documents.list.queryOptions({ input: {} }),
  );

  const addMediaMutation = useMutation(
    apiClient.projects.addMedia.mutationOptions({
      onError: (error) => {
        toast.error(error.message ?? 'Failed to add document');
      },
    }),
  );

  const toggleDoc = (id: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAdd = async () => {
    if (selectedDocs.size === 0) {
      toast.error('Please select at least one document');
      return;
    }

    setIsAdding(true);
    try {
      // Add documents sequentially
      for (const docId of selectedDocs) {
        await addMediaMutation.mutateAsync({
          id: projectId,
          mediaType: 'document',
          mediaId: docId,
        });
      }

      await queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) && query.queryKey[0] === 'projects',
      });

      toast.success(
        `Added ${selectedDocs.size} document${selectedDocs.size === 1 ? '' : 's'} to project`,
      );
      setSelectedDocs(new Set());
      onOpenChange(false);
    } finally {
      setIsAdding(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedDocs(new Set());
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Documents</DialogTitle>
          <DialogDescription>
            Select documents to add to this project. These will be available as
            source material for podcasts.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {loadingDocs ? (
            <div className="flex justify-center py-8">
              <Spinner className="w-5 h-5" />
            </div>
          ) : !documents?.length ? (
            <EmptyState />
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {documents.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  doc={doc}
                  selected={selectedDocs.has(doc.id)}
                  onToggle={() => toggleDoc(doc.id)}
                  disabled={existingMediaIds.includes(doc.id)}
                />
              ))}
            </div>
          )}
        </div>

        {selectedDocs.size > 0 && (
          <p className="text-sm text-violet-600 dark:text-violet-400 mt-2">
            {selectedDocs.size} document{selectedDocs.size === 1 ? '' : 's'}{' '}
            selected
          </p>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={isAdding || selectedDocs.size === 0}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white"
          >
            {isAdding ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Adding...
              </>
            ) : (
              `Add ${selectedDocs.size > 0 ? selectedDocs.size : ''} Document${selectedDocs.size === 1 ? '' : 's'}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
