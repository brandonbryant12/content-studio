import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Spinner } from '@repo/ui/components/spinner';
import { cn } from '@repo/ui/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';
import type { StagingProps, PodcastFull } from '../workbench-registry';
import type { ScriptSegment } from './script-editor';
import { StagingDocumentCard } from '../document-card';
import { StagingScriptSection, StagingEmptyState } from './components';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';

export function PodcastStaging({
  selectedDocuments,
  onRemoveDocument,
  onAddSources,
  media,
  isEditMode,
}: StagingProps) {
  const podcast = media as PodcastFull | undefined;

  const { setNodeRef, isOver } = useDroppable({
    id: 'staging-dropzone',
    disabled: isEditMode,
  });

  const [isEditingScript, setIsEditingScript] = useState(false);
  const [editedSegments, setEditedSegments] = useState<ScriptSegment[]>([]);

  const hasDocuments = selectedDocuments.length > 0;
  const hasScript = podcast?.script && podcast.script.segments.length > 0;
  const hasAudio = podcast?.audioUrl;
  const isScriptReady = podcast?.status === 'script_ready';
  const isGenerating = podcast?.status === 'generating_script' || podcast?.status === 'generating_audio';

  const updateScriptMutation = useMutation(
    apiClient.podcasts.updateScript.mutationOptions({
      onSuccess: () => {
        invalidateQueries('podcasts');
        setIsEditingScript(false);
        toast.success('Script updated!');
      },
      onError: (error) => {
        toast.error(error.message ?? 'Failed to update script');
      },
    }),
  );

  const handleStartEditing = () => {
    if (podcast?.script?.segments) {
      setEditedSegments([...podcast.script.segments]);
      setIsEditingScript(true);
    }
  };

  const handleCancelEditing = () => {
    setIsEditingScript(false);
    setEditedSegments([]);
  };

  const handleSaveScript = () => {
    if (podcast) {
      updateScriptMutation.mutate({
        id: podcast.id,
        segments: editedSegments,
      });
    }
  };

  // Edit mode - show podcast content
  if (isEditMode && podcast) {
    return (
      <div className="flex flex-col h-full p-6 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {podcast.title}
          </h2>
          {podcast.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {podcast.description}
            </p>
          )}
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Source Documents ({selectedDocuments.length})
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-normal">
              Drag to reorder
            </span>
          </h3>
          <div className="mb-4">
            {hasDocuments ? (
              <SortableContext
                items={selectedDocuments.map((d) => d.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {selectedDocuments.map((doc, index) => (
                      <motion.div
                        key={doc.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <StagingDocumentCard
                          document={doc}
                          variant="staging"
                          index={index}
                          onRemove={() => onRemoveDocument(doc.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </SortableContext>
            ) : (
              <StagingEmptyState type="no-documents" isOver={isOver} onAddSources={onAddSources} />
            )}
          </div>
        </div>

        {hasScript && (
          <StagingScriptSection
            segments={podcast.script!.segments}
            summary={podcast.script!.summary}
            isEditing={isEditingScript}
            isScriptReady={isScriptReady}
            isSaving={updateScriptMutation.isPending}
            editedSegments={editedSegments}
            onStartEditing={handleStartEditing}
            onCancelEditing={handleCancelEditing}
            onSaveScript={handleSaveScript}
            onSegmentsChange={setEditedSegments}
          />
        )}

        {isGenerating && (
          <div className="mb-6 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800">
            <div className="flex items-center gap-3">
              <Spinner className="w-5 h-5 text-violet-500" />
              <div>
                <p className="text-sm font-medium text-violet-900 dark:text-violet-100">
                  {podcast?.status === 'generating_script' ? 'Generating script...' : 'Generating audio...'}
                </p>
                <p className="text-xs text-violet-700 dark:text-violet-300">
                  This may take a few minutes
                </p>
              </div>
            </div>
          </div>
        )}

        {hasAudio && (
          <div className="mt-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Audio
              </h3>
              {podcast?.duration && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {Math.floor(podcast.duration / 60)}:{(podcast.duration % 60).toString().padStart(2, '0')}
                </span>
              )}
            </div>
            <div className="p-4 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 rounded-xl border border-violet-200 dark:border-violet-800">
              <audio controls className="w-full" src={podcast?.audioUrl ?? undefined}>
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        )}

        {!hasScript && !isGenerating && podcast?.status === 'draft' && (
          <StagingEmptyState type="draft" />
        )}
      </div>
    );
  }

  // Create mode
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col h-full p-6 overflow-y-auto',
        isOver && 'bg-violet-50 dark:bg-violet-900/10',
      )}
    >
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Selected Documents
          </h3>
          {hasDocuments && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Drag to reorder
            </span>
          )}
        </div>

        {hasDocuments ? (
          <SortableContext
            items={selectedDocuments.map((d) => d.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {selectedDocuments.map((doc, index) => (
                  <motion.div
                    key={doc.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <StagingDocumentCard
                      document={doc}
                      variant="staging"
                      index={index}
                      onRemove={() => onRemoveDocument(doc.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </SortableContext>
        ) : (
          <StagingEmptyState type="no-documents" isOver={isOver} onAddSources={onAddSources} />
        )}
      </div>

      {hasDocuments && (
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Script
            </h3>
            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded">
              Preview
            </span>
          </div>
          <StagingEmptyState type="preview" />
        </div>
      )}
    </div>
  );
}
