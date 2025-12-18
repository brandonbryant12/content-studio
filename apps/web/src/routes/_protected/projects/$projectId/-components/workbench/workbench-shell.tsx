import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { ArrowLeftIcon, FileTextIcon, PlusIcon, Cross2Icon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Link } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useCallback } from 'react';
import type { Document, StagingProps, CommitProps, MediaData } from './workbench-registry';
import { SourcePanel } from './source-panel';

interface WorkbenchShellProps {
  projectId: string;
  projectTitle: string;
  mediaTypeLabel: string;
  gradient: string;
  documents: Document[];
  selectedDocumentIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onAddExisting: () => void;
  onUploadNew: () => void;
  StagingComponent: React.ComponentType<StagingProps>;
  CommitComponent: React.ComponentType<CommitProps>;
  onSuccess: () => void;
  // Edit mode props
  media?: MediaData | null;
  isEditMode: boolean;
}

export function WorkbenchShell({
  projectId,
  projectTitle,
  mediaTypeLabel,
  gradient,
  documents,
  selectedDocumentIds,
  onSelectionChange,
  onAddExisting,
  onUploadNew,
  StagingComponent,
  CommitComponent,
  onSuccess,
  media,
  isEditMode,
}: WorkbenchShellProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSourcePanelOpen, setIsSourcePanelOpen] = useState(false);

  // Convert array to Set for source panel
  const selectedIdsSet = new Set(selectedDocumentIds);

  // Get selected documents in order
  const selectedDocuments = selectedDocumentIds
    .map((id) => documents.find((d) => d.id === id))
    .filter((d): d is Document => d !== undefined);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Handle selection change from source panel (Set to array)
  const handleSourceSelectionChange = useCallback(
    (ids: Set<string>) => {
      // Preserve order of existing selections, append new ones
      const existingOrder = selectedDocumentIds.filter((id) => ids.has(id));
      const newIds = Array.from(ids).filter(
        (id) => !selectedDocumentIds.includes(id),
      );
      onSelectionChange([...existingOrder, ...newIds]);
    },
    [selectedDocumentIds, onSelectionChange],
  );

  // Handle document order change within staging area
  const handleDocumentOrderChange = useCallback(
    (newOrder: string[]) => {
      onSelectionChange(newOrder);
    },
    [onSelectionChange],
  );

  // Handle removing a document from staging
  const handleRemoveDocument = useCallback(
    (documentId: string) => {
      onSelectionChange(selectedDocumentIds.filter((id) => id !== documentId));
    },
    [selectedDocumentIds, onSelectionChange],
  );

  // Drag start handler
  const handleDragStart = (event: DragStartEvent) => {
    // Disable dragging in edit mode
    // if (isEditMode) return;
    const { active } = event;
    setActiveId(active.id as string);
  };

  // Drag end handler
  const handleDragEnd = (event: DragEndEvent) => {
    // Disable drag operations in edit mode
    /* if (isEditMode) {
      setActiveId(null);
      return;
    } */

    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    // Handle drag from source to staging (add document)
    if (activeIdStr.startsWith('source-')) {
      const documentId = activeIdStr.replace('source-', '');
      if (overIdStr === 'staging-dropzone' && !selectedDocumentIds.includes(documentId)) {
        onSelectionChange([...selectedDocumentIds, documentId]);
      }
      return;
    }

    // Handle drag from staging to source (remove document)
    if (overIdStr === 'source-panel-dropzone') {
      handleRemoveDocument(activeIdStr);
      return;
    }

    // Handle reordering within staging
    if (activeIdStr !== overIdStr && selectedDocumentIds.includes(overIdStr)) {
      const oldIndex = selectedDocumentIds.indexOf(activeIdStr);
      const newIndex = selectedDocumentIds.indexOf(overIdStr);
      if (oldIndex !== -1 && newIndex !== -1) {
        onSelectionChange(arrayMove(selectedDocumentIds, oldIndex, newIndex));
      }
    }
  };

  // Get the active document for drag overlay
  const activeDocument = activeId
    ? documents.find(
      (d) => d.id === activeId || d.id === activeId.replace('source-', ''),
    )
    : null;

  // Get title for edit mode
  const headerTitle = isEditMode && media
    ? (media as { title?: string }).title || mediaTypeLabel
    : `Create ${mediaTypeLabel}`;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full bg-white dark:bg-gray-950">
        {/* Header */}
        <header className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <Link to="/projects/$projectId" params={{ projectId }}>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeftIcon className="w-4 h-4" />
            </Button>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-md bg-gradient-to-br ${gradient} flex items-center justify-center`}
              >
                <span className="text-xs text-white font-bold">
                  {mediaTypeLabel[0]}
                </span>
              </div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {headerTitle}
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {projectTitle}
            </p>
          </div>
        </header>

        {/* Main content: Source + Staging + Commit */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Source Panel (Drawer) */}
          <AnimatePresence>
            {isSourcePanelOpen && (
              <>
                {/* Backdrop for mobile/overlay feel if needed, but we'll push content or overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSourcePanelOpen(false)}
                  className="absolute inset-0 bg-black/20 backdrop-blur-sm z-10 lg:hidden"
                />
                <motion.div
                  initial={{ x: -320 }}
                  animate={{ x: 0 }}
                  exit={{ x: -320 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="absolute left-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 z-20 shadow-xl"
                >
                  <SourcePanel
                    documents={documents}
                    selectedIds={selectedIdsSet}
                    onSelectionChange={handleSourceSelectionChange}
                    onAddExisting={onAddExisting}
                    onUploadNew={onUploadNew}
                    readOnly={false}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 lg:hidden"
                    onClick={() => setIsSourcePanelOpen(false)}
                  >
                    <Cross2Icon className="w-4 h-4" />
                  </Button>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Staging Area (pluggable) */}
          <div className="flex-1 overflow-hidden flex flex-col relative z-0">
            {/* Toolbar */}
            <div className="px-6 py-2 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <Button
                variant={isSourcePanelOpen ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setIsSourcePanelOpen(!isSourcePanelOpen)}
                className="gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                {isSourcePanelOpen ? 'Hide Sources' : 'Add Sources'}
              </Button>

              <div className="text-xs text-gray-500">
                {selectedDocumentIds.length} documents selected
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <SortableContext
                items={selectedDocumentIds}
                strategy={verticalListSortingStrategy}
              >
                <StagingComponent
                  projectId={projectId}
                  selectedDocuments={selectedDocuments}
                  onDocumentOrderChange={handleDocumentOrderChange}
                  onRemoveDocument={handleRemoveDocument}
                  onAddSources={() => setIsSourcePanelOpen(true)}
                  media={media}
                  isEditMode={isEditMode}
                />
              </SortableContext>
            </div>
          </div>

          {/* Commit Panel (pluggable) */}
          <div className="w-80 shrink-0 border-l border-gray-200 dark:border-gray-800 overflow-y-auto bg-white dark:bg-gray-950 relative z-0">
            <CommitComponent
              projectId={projectId}
              selectedDocumentIds={selectedDocumentIds}
              onSuccess={onSuccess}
              disabled={selectedDocumentIds.length === 0}
              media={media}
              isEditMode={isEditMode}
            />
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
          {activeDocument && (
            <div className="flex items-center gap-3 p-3 rounded-xl border bg-white dark:bg-gray-900 border-violet-300 dark:border-violet-700 shadow-lg">
              <div className="w-8 h-8 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FileTextIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {activeDocument.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {activeDocument.wordCount.toLocaleString()} words
                </p>
              </div>
            </div>
          )}
        </DragOverlay>
    </DndContext>
  );
}
