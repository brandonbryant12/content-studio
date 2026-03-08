import { VersionStatus } from '@repo/api/contracts';
import type { UsePodcastSettingsReturn } from '../hooks/use-podcast-settings';
import type { UseScriptEditorReturn } from '../hooks/use-script-editor';
import type { UseSourceSelectionReturn } from '../hooks/use-source-selection';
import type { RouterOutput } from '@repo/api/client';
import { AudioPlayer } from './audio-player';
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

interface PodcastWorkbenchState {
  hasChanges: boolean;
  isGenerating: boolean;
  isPendingGeneration: boolean;
  isSaving: boolean;
  isDeleting: boolean;
}

interface PodcastApprovalState {
  isApproved: boolean;
  isAdmin: boolean;
  isApprovalPending: boolean;
}

interface PodcastDetailProps {
  podcast: Podcast;
  scriptEditor: UseScriptEditorReturn;
  settings: UsePodcastSettingsReturn;
  sourceSelection: UseSourceSelectionReturn;
  displayAudio: DisplayAudio | null;
  workbenchState: PodcastWorkbenchState;
  approvalState: PodcastApprovalState;
  onSave: () => void;
  onGenerate: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onRevoke: () => void;
  canExportAudio?: boolean;
  canExportScript?: boolean;
  onExportAudio?: () => void;
  onExportScript?: () => void;
  onCopyTranscript?: () => void;
}

export function PodcastDetail({
  podcast,
  scriptEditor,
  settings,
  sourceSelection,
  displayAudio,
  workbenchState,
  approvalState,
  onSave,
  onGenerate,
  onDelete,
  onApprove,
  onRevoke,
  canExportAudio = false,
  canExportScript = false,
  onExportAudio,
  onExportScript,
  onCopyTranscript,
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
      canExportAudio={canExportAudio}
      canExportScript={canExportScript}
      onExportAudio={onExportAudio}
      onExportScript={onExportScript}
      onCopyTranscript={onCopyTranscript}
      leftPanel={
        <ScriptPanel
          segments={scriptEditor.segments}
          summary={podcast.summary ?? null}
          hasChanges={scriptEditor.hasChanges}
          isSaving={scriptEditor.isSaving}
          disabled={podcast.status !== VersionStatus.READY}
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
          sourceSelection={sourceSelection}
        />
      }
      audioStrip={displayAudio ? <AudioPlayer url={displayAudio.url} /> : null}
      actionBar={
        <GlobalActionBar
          status={podcast.status}
          isGenerating={isGenerating}
          hasChanges={hasChanges}
          isSaving={isSaving}
          onSave={onSave}
          onGenerate={onGenerate}
          disabled={isGenerating}
          errorMessage={podcast.errorMessage}
        />
      }
    />
  );
}
