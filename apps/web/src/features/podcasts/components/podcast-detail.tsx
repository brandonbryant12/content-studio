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

export interface PodcastWorkbenchState {
  hasChanges: boolean;
  isGenerating: boolean;
  isPendingGeneration: boolean;
  isSaving: boolean;
  isDeleting: boolean;
}

export interface PodcastApprovalState {
  isApproved: boolean;
  isAdmin: boolean;
  isApprovalPending: boolean;
}

export interface PodcastDetailProps {
  podcast: Podcast;
  scriptEditor: UseScriptEditorReturn;
  settings: UsePodcastSettingsReturn;
  documentSelection: UseDocumentSelectionReturn;
  displayAudio: DisplayAudio | null;
  workbenchState: PodcastWorkbenchState;
  approvalState: PodcastApprovalState;
  onSave: () => void;
  onGenerate: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onRevoke: () => void;
}

export function PodcastDetail({
  podcast,
  scriptEditor,
  settings,
  documentSelection,
  displayAudio,
  workbenchState,
  approvalState,
  onSave,
  onGenerate,
  onDelete,
  onApprove,
  onRevoke,
}: PodcastDetailProps) {
  const {
    hasChanges,
    isGenerating,
    isPendingGeneration,
    isSaving,
    isDeleting,
  } = workbenchState;
  const { isApproved, isAdmin, isApprovalPending } = approvalState;

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
