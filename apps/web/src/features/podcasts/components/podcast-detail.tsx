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
  owner: {
    id: string;
    name: string;
    image?: string | null;
  };
  collaborators: readonly {
    id: string;
    podcastId: string;
    userId: string | null;
    email: string;
    userName: string | null;
    userImage: string | null;
  }[];
  isApproved: boolean;
  isAdmin: boolean;
  onManageCollaborators: () => void;
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
  owner,
  collaborators,
  isApproved,
  isAdmin,
  onManageCollaborators,
  onApprove,
  onRevoke,
  isApprovalPending,
}: PodcastDetailProps) {
  return (
    <WorkbenchLayout
      podcast={podcast}
      onDelete={onDelete}
      isDeleting={isDeleting}
      owner={owner}
      collaborators={collaborators}
      isApproved={isApproved}
      isAdmin={isAdmin}
      onManageCollaborators={onManageCollaborators}
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
