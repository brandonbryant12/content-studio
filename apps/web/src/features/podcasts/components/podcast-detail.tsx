import type { UseDocumentSelectionReturn } from '../hooks/use-document-selection';
import type { UsePodcastSettingsReturn } from '../hooks/use-podcast-settings';
import type { UseScriptEditorReturn } from '../hooks/use-script-editor';
import type { RouterOutput } from '@repo/api/client';
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

export interface PodcastDetailProps {
  podcast: Podcast;
  scriptEditor: UseScriptEditorReturn;
  settings: UsePodcastSettingsReturn;
  documentSelection: UseDocumentSelectionReturn;
  displayAudio: DisplayAudio | null;
  hasChanges: boolean;
  isGenerating: boolean;
  isPendingGeneration: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onSave: () => void;
  onGenerate: () => void;
  onDelete: () => void;
  isApproved: boolean;
  isAdmin: boolean;
  onApprove: () => void;
  onRevoke: () => void;
  isApprovalPending: boolean;
}

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
  isApproved,
  isAdmin,
  onApprove,
  onRevoke,
  isApprovalPending,
}: PodcastDetailProps) {
  return (
    <WorkbenchLayout
      podcast={podcast}
      onDelete={onDelete}
      isDeleting={isDeleting}
      isApproved={isApproved}
      isAdmin={isAdmin}
      onApprove={onApprove}
      onRevoke={onRevoke}
      isApprovalPending={isApprovalPending}
      leftPanel={
        <ScriptPanel
          segments={scriptEditor.segments}
          summary={podcast.summary ?? null}
          hasChanges={scriptEditor.hasChanges}
          isSaving={scriptEditor.isSaving}
          disabled={podcast.status !== 'ready'}
          onUpdateSegment={scriptEditor.updateSegment}
          onRemoveSegment={scriptEditor.removeSegment}
          onAddSegment={scriptEditor.addSegment}
          onDiscard={scriptEditor.discardChanges}
        />
      }
      rightPanel={
        <ConfigPanel
          podcast={podcast}
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
          audioUrl={displayAudio?.url}
        />
      }
    />
  );
}
