// features/podcasts/components/podcast-detail-container.tsx

import { lazy, Suspense } from 'react';
import { useKeyboardShortcut, useNavigationBlock, useSessionGuard } from '@/shared/hooks';
import { usePodcast } from '../hooks/use-podcast';
import { useScriptEditor } from '../hooks/use-script-editor';
import { usePodcastSettings } from '../hooks/use-podcast-settings';
import { useDocumentSelection } from '../hooks/use-document-selection';
import { usePodcastActions } from '../hooks/use-podcast-actions';
import { useCollaboratorManagement } from '../hooks/use-collaborator-management';
import { isSetupMode } from '../lib/status';
import { SetupWizardContainer } from './setup-wizard-container';
import { PodcastDetail } from './podcast-detail';

// Dynamic import for AddCollaboratorDialog (conditionally rendered)
const AddCollaboratorDialog = lazy(() =>
  import('./collaborators/add-collaborator-dialog').then((m) => ({
    default: m.AddCollaboratorDialog,
  })),
);

interface PodcastDetailContainerProps {
  podcastId: string;
}

/**
 * Container: Fetches podcast data and coordinates all state/mutations.
 * Renders SetupWizardContainer for new podcasts, PodcastDetail for configured ones.
 */
export function PodcastDetailContainer({
  podcastId,
}: PodcastDetailContainerProps) {
  // Get current user
  const { user } = useSessionGuard();
  const currentUserId = user?.id ?? '';

  // Data fetching (Suspense handles loading)
  const { data: podcast } = usePodcast(podcastId);

  // State management via custom hooks
  const scriptEditor = useScriptEditor({
    podcastId,
    initialSegments: [...(podcast.segments ?? [])],
  });

  const settings = usePodcastSettings({ podcast });

  const documentSelection = useDocumentSelection({
    initialDocuments: [...(podcast.documents ?? [])],
  });

  // Consolidated actions hook
  const actions = usePodcastActions({
    podcastId,
    podcast,
    scriptEditor,
    settings,
    documentSelection,
  });

  // Collaborator management
  const collaboratorManagement = useCollaboratorManagement(podcastId);

  // Owner info for collaborator display
  const owner = {
    id: podcast.createdBy,
    name: user?.id === podcast.createdBy ? (user?.name ?? 'You') : 'Owner',
    image: user?.id === podcast.createdBy ? user?.image : undefined,
    hasApproved: podcast.ownerHasApproved,
  };

  // Check if current user has approved
  const currentUserHasApproved =
    podcast.createdBy === currentUserId
      ? podcast.ownerHasApproved
      : (collaboratorManagement.collaborators.find(
          (c) => c.userId === currentUserId,
        )?.hasApproved ?? false);

  // Keyboard shortcut: Cmd/Ctrl+S to save
  useKeyboardShortcut({
    key: 's',
    cmdOrCtrl: true,
    onTrigger: actions.handleSave,
    enabled: actions.hasAnyChanges,
  });

  // Block navigation if there are unsaved changes
  useNavigationBlock({
    shouldBlock: actions.hasAnyChanges,
  });

  // Show setup wizard for new podcasts
  if (isSetupMode(podcast)) {
    return <SetupWizardContainer podcast={podcast} />;
  }

  // Audio from podcast
  const displayAudio = podcast.audioUrl
    ? {
        url: podcast.audioUrl,
        duration: podcast.duration ?? null,
      }
    : null;

  return (
    <>
      <PodcastDetail
        podcast={podcast}
        scriptEditor={scriptEditor}
        settings={settings}
        documentSelection={documentSelection}
        displayAudio={displayAudio}
        hasChanges={actions.hasAnyChanges}
        isGenerating={actions.isGenerating}
        isPendingGeneration={actions.isPendingGeneration}
        isSaving={actions.isSaving}
        isDeleting={actions.isDeleting}
        onSave={actions.handleSave}
        onGenerate={actions.handleGenerate}
        onDelete={actions.handleDelete}
        currentUserId={currentUserId}
        owner={owner}
        collaborators={collaboratorManagement.collaborators}
        currentUserHasApproved={currentUserHasApproved}
        onManageCollaborators={collaboratorManagement.openAddDialog}
      />
      {collaboratorManagement.isAddDialogOpen && (
        <Suspense fallback={null}>
          <AddCollaboratorDialog
            podcastId={podcastId}
            isOpen={collaboratorManagement.isAddDialogOpen}
            onClose={collaboratorManagement.closeAddDialog}
          />
        </Suspense>
      )}
    </>
  );
}
