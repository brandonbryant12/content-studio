import { useDroppable } from '@dnd-kit/core';
import {
  FileTextIcon,
  MagnifyingGlassIcon,
  PlusIcon,
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
import { cn } from '@repo/ui/lib/utils';
import { useState, useMemo } from 'react';
import type { Document } from './workbench-registry';
import { SourceDocumentCard } from './document-card';

interface SourcePanelProps {
  documents: Document[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onAddExisting: () => void;
  onUploadNew: () => void;
  readOnly?: boolean;
}

export function SourcePanel({
  documents,
  selectedIds,
  onSelectionChange,
  onAddExisting,
  onUploadNew,
  readOnly = false,
}: SourcePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Droppable zone for removing documents from staging (disabled in read-only mode)
  const { setNodeRef, isOver } = useDroppable({
    id: 'source-panel-dropzone',
    disabled: readOnly,
  });

  const filteredDocuments = useMemo(() => {
    if (!searchQuery) return documents;
    return documents.filter((doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [documents, searchQuery]);

  const handleToggle = (docId: string) => {
    if (readOnly) return;
    const newSelection = new Set(selectedIds);
    if (newSelection.has(docId)) {
      newSelection.delete(docId);
    } else {
      newSelection.add(docId);
    }
    onSelectionChange(newSelection);
  };

  const selectAll = () => {
    if (readOnly) return;
    onSelectionChange(new Set(documents.map((d) => d.id)));
  };

  const clearSelection = () => {
    if (readOnly) return;
    onSelectionChange(new Set());
  };

  const totalSelected = selectedIds.size;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col h-full border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 w-72 shrink-0 relative',
        !readOnly && isOver && 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800',
      )}
    >
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
        {!readOnly && documents.length > 0 && (
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
            >
              Select all
            </button>
            {totalSelected > 0 && (
              <>
                <span className="text-xs text-gray-300 dark:text-gray-600">|</span>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        )}
        {readOnly && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Documents are read-only for existing media
          </p>
        )}
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
              <FileTextIcon className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              No documents in project
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Add documents to get started
            </p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No documents match "{searchQuery}"
            </p>
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <SourceDocumentCard
              key={doc.id}
              document={doc}
              variant="source"
              isSelected={selectedIds.has(doc.id)}
              onToggle={() => handleToggle(doc.id)}
              readOnly={readOnly}
            />
          ))
        )}
      </div>

      {/* Drop hint when dragging from staging (only in create mode) */}
      {!readOnly && isOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50/80 dark:bg-red-900/40 pointer-events-none">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            Drop to remove
          </p>
        </div>
      )}

      {/* Footer - hide in read-only mode */}
      {!readOnly && (
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
      )}
    </div>
  );
}
