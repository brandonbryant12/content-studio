import { lazy, Suspense } from 'react';
import { useCollaboratorManagement } from '../hooks/use-collaborator-management';
import { useVoiceover } from '../hooks/use-voiceover';
import { useVoiceoverActions } from '../hooks/use-voiceover-actions';
import { useVoiceoverSettings } from '../hooks/use-voiceover-settings';
import { VoiceoverDetail } from './voiceover-detail';
import {
  useKeyboardShortcut,
  useNavigationBlock,
  useSessionGuard,
} from '@/shared/hooks';

const AddCollaboratorDialog = lazy(() =>
  import('./collaborators/add-collaborator-dialog').then((m) => ({
    default: m.AddCollaboratorDialog,
  })),
);

interface VoiceoverDetailContainerProps {
  voiceoverId: string;
}

export function VoiceoverDetailContainer({
  voiceoverId,
}: VoiceoverDetailContainerProps) {
  const { user } = useSessionGuard();
  const currentUserId = user?.id ?? '';

  const { data: voiceover } = useVoiceover(voiceoverId);

  const settings = useVoiceoverSettings({ voiceover });
  const collaboratorManagement = useCollaboratorManagement(
    voiceover,
    currentUserId,
    user,
  );

  const actions = useVoiceoverActions({
    voiceoverId,
    voiceover,
    settings,
  });

  useKeyboardShortcut({
    key: 's',
    cmdOrCtrl: true,
    onTrigger: actions.handleGenerate,
    enabled: actions.hasChanges,
  });

  useNavigationBlock({
    shouldBlock: actions.hasChanges,
  });

  const displayAudio = voiceover.audioUrl
    ? {
        url: voiceover.audioUrl,
        duration: voiceover.duration ?? null,
      }
    : null;

  const isOwner = currentUserId === voiceover.createdBy;

  return (
    <>
      <VoiceoverDetail
        voiceover={voiceover}
        settings={settings}
        displayAudio={displayAudio}
        hasChanges={actions.hasChanges}
        hasText={actions.hasText}
        isGenerating={actions.isGenerating}
        isSaving={actions.isSaving}
        isDeleting={actions.isDeleting}
        onGenerate={actions.handleGenerate}
        onDelete={actions.handleDelete}
        owner={collaboratorManagement.owner}
        collaborators={collaboratorManagement.collaborators}
        isApproved={collaboratorManagement.isApproved}
        isAdmin={collaboratorManagement.isAdmin}
        onManageCollaborators={collaboratorManagement.openAddDialog}
        onApprove={collaboratorManagement.handleApprove}
        onRevoke={collaboratorManagement.handleRevoke}
        isApprovalPending={collaboratorManagement.isApprovalPending}
      />

      {isOwner && collaboratorManagement.isAddDialogOpen && (
        <Suspense fallback={null}>
          <AddCollaboratorDialog
            voiceoverId={voiceoverId}
            isOpen={collaboratorManagement.isAddDialogOpen}
            onClose={collaboratorManagement.closeAddDialog}
          />
        </Suspense>
      )}
    </>
  );
}
