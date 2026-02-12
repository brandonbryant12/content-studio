import { useCallback } from 'react';
import { useApproveVoiceover } from '../hooks/use-approve-voiceover';
import { useVoiceover } from '../hooks/use-voiceover';
import { useVoiceoverActions } from '../hooks/use-voiceover-actions';
import { useVoiceoverSettings } from '../hooks/use-voiceover-settings';
import { VoiceoverDetail } from './voiceover-detail';
import {
  useKeyboardShortcut,
  useNavigationBlock,
  useSessionGuard,
  useIsAdmin,
} from '@/shared/hooks';

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

  const { approve, revoke } = useApproveVoiceover(voiceoverId, currentUserId);

  const actions = useVoiceoverActions({
    voiceoverId,
    voiceover,
    settings,
  });

  const isAdmin = useIsAdmin();
  const isApproved = voiceover.approvedBy !== null;

  const handleApprove = useCallback(() => {
    approve.mutate({ id: voiceoverId });
  }, [approve, voiceoverId]);

  const handleRevoke = useCallback(() => {
    revoke.mutate({ id: voiceoverId });
  }, [revoke, voiceoverId]);

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

  return (
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
      isApproved={isApproved}
      isAdmin={isAdmin}
      onApprove={handleApprove}
      onRevoke={handleRevoke}
      isApprovalPending={approve.isPending || revoke.isPending}
    />
  );
}
