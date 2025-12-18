import {
  CheckIcon,
  FileTextIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  UploadIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { cn } from '@repo/ui/lib/utils';
import { useState, useMemo } from 'react';
import type { RouterOutput } from '@repo/api/client';

type Document = RouterOutput['projects']['get']['documents'][number];

interface ContentLibraryProps {
  documents: Document[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onAddExisting: () => void;
  onUploadNew: () => void;
  onRemoveDocument: (documentId: string) => void;
  isRemoving: boolean;
  removingDocumentId?: string;
}

function Checkbox({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onCheckedChange();
      }}
      className={cn(
        'h-4 w-4 shrink-0 rounded-sm border transition-colors',
        checked
          ? 'bg-violet-500 border-violet-500'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
      )}
    >
      {checked && <CheckIcon className="h-3.5 w-3.5 text-white" />}
    </button>
  );
}

export function ContentLibrary({
  documents,
  selectedIds,
  onSelectionChange,
  onAddExisting,
  onUploadNew,
  onRemoveDocument,
  isRemoving,
  removingDocumentId,
}: ContentLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocuments = useMemo(() => {
    if (!searchQuery) return documents;
    return documents.filter((doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [documents, searchQuery]);

  const handleToggle = (docId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(docId)) {
      newSelection.delete(docId);
    } else {
      newSelection.add(docId);
    }
    onSelectionChange(newSelection);
  };

  const totalSelected = selectedIds.size;

  return (
    <div className="flex flex-col h-full border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Source Documents
          </h2>
          {totalSelected > 0 && (
            <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-2 py-1 rounded-full">
              {totalSelected} selected
            </span>
          )}
        </div>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-white dark:bg-gray-900"
          />
        </div>
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
              <FileTextIcon className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              No documents yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Add documents to get started
            </p>
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className={cn(
                'group flex items-center gap-3 px-2 py-2 rounded-lg transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                selectedIds.has(doc.id) && 'bg-violet-50 dark:bg-violet-900/20',
              )}
            >
              <Checkbox
                checked={selectedIds.has(doc.id)}
                onCheckedChange={() => handleToggle(doc.id)}
                label={`Select ${doc.title}`}
              />
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleToggle(doc.id)}>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {doc.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {doc.wordCount.toLocaleString()} words
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveDocument(doc.id);
                }}
                disabled={isRemoving && removingDocumentId === doc.id}
                className="opacity-0 group-hover:opacity-100 h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              >
                {isRemoving && removingDocumentId === doc.id ? (
                  <Spinner className="w-3 h-3" />
                ) : (
                  <TrashIcon className="w-3 h-3" />
                )}
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-center">
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Document
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            <DropdownMenuItem onClick={onUploadNew}>
              <UploadIcon className="w-4 h-4 mr-2" />
              Upload Document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAddExisting}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Existing
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
