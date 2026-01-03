// features/podcasts/components/podcast-detail.tsx

import type { RouterOutput } from '@repo/api/client';
import type {
  UseScriptEditorReturn,
  UsePodcastSettingsReturn,
  UseDocumentSelectionReturn,
} from '../hooks';
import {
  WorkbenchLayout,
  ScriptPanel,
  ConfigPanel,
  GlobalActionBar,
} from './workbench';

type Podcast = RouterOutput['podcasts']['get'];

interface DisplayAudio {
  url: string;
  duration: number | null;
}

/**
 * Props: All data in, all events out.
 */
export interface PodcastDetailProps {
  // Data
  podcast: Podcast;
  scriptEditor: UseScriptEditorReturn;
  settings: UsePodcastSettingsReturn;
  documentSelection: UseDocumentSelectionReturn;
  displayAudio: DisplayAudio | null;

  // State flags
  hasChanges: boolean;
  isGenerating: boolean;
  isPendingGeneration: boolean;
  isSaving: boolean;
  isDeleting: boolean;

  // Event callbacks
  onSave: () => void;
  onGenerate: () => void;
  onDelete: () => void;
}

/**
 * Presenter: Pure rendering component for the podcast workbench.
 */
export function PodcastDetail({
  podcast,
  scriptEditor,
  settings,
  documentSelection,
  displayAudio,
  hasChanges,
  isGenerating,
  isPendingGeneration,
  isSaving,
  isDeleting,
  onSave,
  onGenerate,
  onDelete,
}: PodcastDetailProps) {
  return (
    <WorkbenchLayout
      podcast={podcast}
      onDelete={onDelete}
      isDeleting={isDeleting}
      leftPanel={
        <ScriptPanel
          segments={scriptEditor.segments}
          summary={podcast.summary ?? null}
          hasChanges={scriptEditor.hasChanges}
          isSaving={scriptEditor.isSaving}
          disabled={podcast.status !== 'ready'}
          onUpdateSegment={scriptEditor.updateSegment}
          onRemoveSegment={scriptEditor.removeSegment}
          onReorderSegments={scriptEditor.reorderSegments}
          onAddSegment={scriptEditor.addSegment}
          onDiscard={scriptEditor.discardChanges}
        />
      }
      rightPanel={
        <ConfigPanel
          podcast={podcast}
          displayAudio={displayAudio}
          isGenerating={isGenerating}
          isPendingGeneration={isPendingGeneration}
          settings={settings}
          documentSelection={documentSelection}
        />
      }
      actionBar={
        <GlobalActionBar
          status={podcast.status}
          isGenerating={isGenerating}
          hasChanges={hasChanges}
          isSaving={isSaving}
          onSave={onSave}
          onGenerate={onGenerate}
          disabled={isGenerating}
        />
      }
    />
  );
}
