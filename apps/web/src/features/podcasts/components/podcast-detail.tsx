// features/podcasts/components/podcast-detail.tsx

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

  // Collaborator props
  currentUserId: string;
  owner: {
    id: string;
    name: string;
    image?: string | null;
    hasApproved: boolean;
  };
  collaborators: readonly {
    id: string;
    podcastId: string;
    userId: string | null;
    email: string;
    userName: string | null;
    userImage: string | null;
    hasApproved: boolean;
  }[];
  currentUserHasApproved: boolean;
  onManageCollaborators: () => void;
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
  currentUserId,
  owner,
  collaborators,
  currentUserHasApproved,
  onManageCollaborators,
}: PodcastDetailProps) {
  return (
    <WorkbenchLayout
      podcast={podcast}
      onDelete={onDelete}
      isDeleting={isDeleting}
      currentUserId={currentUserId}
      owner={owner}
      collaborators={collaborators}
      currentUserHasApproved={currentUserHasApproved}
      onManageCollaborators={onManageCollaborators}
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
