import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  FileTextIcon,
  SpeakerLoudIcon,
  Pencil1Icon,
  CheckIcon,
  Cross2Icon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { cn } from '@repo/ui/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/clients/apiClient';
import { invalidateQueries } from '@/clients/query-helpers';
import Spinner from '@/routes/-components/common/spinner';
import { StagingDocumentCard } from '../document-card';
import type { StagingProps, PodcastFull } from '../workbench-registry';
import { ScriptEditor, type ScriptSegment } from './script-editor';

export function PodcastStaging({
  selectedDocuments,
  onRemoveDocument,
  media,
  isEditMode,
}: StagingProps) {
  const podcast = media as PodcastFull | undefined;

  const { setNodeRef, isOver } = useDroppable({
    id: 'staging-dropzone',
    disabled: isEditMode,
  });

  // Script editing state
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [editedSegments, setEditedSegments] = useState<ScriptSegment[]>([]);

  const hasDocuments = selectedDocuments.length > 0;
  const hasScript = podcast?.script && podcast.script.segments.length > 0;
  const hasAudio = podcast?.audioUrl;
  const isScriptReady = podcast?.status === 'script_ready';
  const isGenerating = podcast?.status === 'generating_script' || podcast?.status === 'generating_audio';

  // Script update mutation
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
        {/* Podcast Title & Description */}
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

        {/* Source Documents */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Source Documents ({podcast.documents.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {podcast.documents.map((doc, index) => (
              <div
                key={doc.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              >
                <div className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
                    {index + 1}
                  </span>
                </div>
                <FileTextIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {doc.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Script Section */}
        {hasScript && (
          <div className="mb-6 flex-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Script
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {podcast.script!.segments.length} segments
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isEditingScript ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEditing}
                      disabled={updateScriptMutation.isPending}
                    >
                      <Cross2Icon className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveScript}
                      disabled={updateScriptMutation.isPending}
                    >
                      {updateScriptMutation.isPending ? (
                        <Spinner className="w-4 h-4 mr-1" />
                      ) : (
                        <CheckIcon className="w-4 h-4 mr-1" />
                      )}
                      Save
                    </Button>
                  </>
                ) : isScriptReady ? (
                  <Button variant="outline" size="sm" onClick={handleStartEditing}>
                    <Pencil1Icon className="w-4 h-4 mr-1" />
                    Edit Script
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-gray-50 dark:bg-gray-900">
              <ScriptEditor
                segments={isEditingScript ? editedSegments : podcast.script!.segments}
                onChange={setEditedSegments}
                readOnly={!isEditingScript}
                summary={podcast.script!.summary}
              />
            </div>
          </div>
        )}

        {/* Generation Progress */}
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

        {/* Audio Section */}
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

        {/* No Script Yet - for drafts */}
        {!hasScript && !isGenerating && podcast?.status === 'draft' && (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center mb-4">
              <SpeakerLoudIcon className="w-8 h-8 text-violet-500" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Ready to generate
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs">
              Click "Generate" in the panel on the right to create the podcast.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Create mode - original behavior
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col h-full p-6 overflow-y-auto',
        isOver && 'bg-violet-50 dark:bg-violet-900/10',
      )}
    >
      {/* Selected Documents Section */}
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
              {selectedDocuments.map((doc, index) => (
                <StagingDocumentCard
                  key={doc.id}
                  document={doc}
                  variant="staging"
                  index={index}
                  onRemove={() => onRemoveDocument(doc.id)}
                />
              ))}
            </div>
          </SortableContext>
        ) : (
          <div
            className={cn(
              'flex flex-col items-center justify-center py-12 px-6 rounded-xl border-2 border-dashed transition-colors',
              isOver
                ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20'
                : 'border-gray-200 dark:border-gray-800',
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <FileTextIcon className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              No documents selected
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs">
              Select documents from the library on the left, or drag them here to start creating your podcast.
            </p>
          </div>
        )}
      </div>

      {/* Script Preview Section (placeholder for create mode) */}
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

          <div className="flex flex-col items-center justify-center py-16 px-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center mb-4">
              <SpeakerLoudIcon className="w-8 h-8 text-violet-500" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Ready to generate
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs">
              Configure your podcast settings and click "Generate" to create a script from your documents.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
