import { lazy, Suspense } from 'react';
import { useCollaboratorManagement } from '../hooks/use-collaborator-management';
import { useDocumentSelection } from '../hooks/use-document-selection';
import { usePodcast } from '../hooks/use-podcast';
import { usePodcastActions } from '../hooks/use-podcast-actions';
import { usePodcastSettings } from '../hooks/use-podcast-settings';
import { useScriptEditor } from '../hooks/use-script-editor';
import { isSetupMode } from '../lib/status';
import { PodcastDetail } from './podcast-detail';
import {
  useKeyboardShortcut,
  useNavigationBlock,
  useSessionGuard,
} from '@/shared/hooks';

const SetupWizardContainer = lazy(() =>
  import('./setup-wizard-container').then((m) => ({
    default: m.SetupWizardContainer,
  })),
);

const AddCollaboratorDialog = lazy(() =>
  import('./collaborators/add-collaborator-dialog').then((m) => ({
    default: m.AddCollaboratorDialog,
  })),
);

interface PodcastDetailContainerProps {
  podcastId: string;
}

export function PodcastDetailContainer({
  podcastId,
}: PodcastDetailContainerProps) {
  const { user } = useSessionGuard();
  const currentUserId = user?.id ?? '';

  const { data: podcast } = usePodcast(podcastId);

  const scriptEditor = useScriptEditor({
    podcastId,
    initialSegments: [...(podcast.segments ?? [])],
  });

  const settings = usePodcastSettings({ podcast });

  const documentSelection = useDocumentSelection({
    initialDocuments: [...(podcast.documents ?? [])],
  });

  const actions = usePodcastActions({
    podcastId,
    podcast,
    scriptEditor,
    settings,
    documentSelection,
  });

  const collaboratorManagement = useCollaboratorManagement(
    podcastId,
    currentUserId,
  );

  const owner = {
    id: podcast.createdBy,
    name: user?.id === podcast.createdBy ? (user?.name ?? 'You') : 'Owner',
    image: user?.id === podcast.createdBy ? user?.image : undefined,
  };

  const isAdmin = (user as { role?: string } | undefined)?.role === 'admin';
  const isApproved = podcast.approvedBy !== null;

  useKeyboardShortcut({
    key: 's',
    cmdOrCtrl: true,
    onTrigger: actions.handleSave,
    enabled: actions.hasAnyChanges,
  });

  useNavigationBlock({
    shouldBlock: actions.hasAnyChanges,
  });

  if (isSetupMode(podcast)) {
    return (
      <Suspense fallback={null}>
        <SetupWizardContainer podcast={podcast} />
      </Suspense>
    );
  }

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
        owner={owner}
        collaborators={collaboratorManagement.collaborators}
        isApproved={isApproved}
        isAdmin={isAdmin}
        onManageCollaborators={collaboratorManagement.openAddDialog}
        onApprove={collaboratorManagement.handleApprove}
        onRevoke={collaboratorManagement.handleRevoke}
        isApprovalPending={collaboratorManagement.isApprovalPending}
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
