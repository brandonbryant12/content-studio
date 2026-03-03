import { useCallback } from 'react';
import { toast } from 'sonner';
import { useApproveVoiceover } from '../hooks/use-approve-voiceover';
import { useVoiceover } from '../hooks/use-voiceover';
import { useVoiceoverActions } from '../hooks/use-voiceover-actions';
import { useVoiceoverSettings } from '../hooks/use-voiceover-settings';
import {
  buildVoiceoverTextExport,
  buildVoiceoverTranscriptMarkdown,
} from '../lib/export';
import { VoiceoverDetail } from './voiceover-detail';
import { WritingAssistantContainer } from './workbench/writing-assistant-container';
import {
  useKeyboardShortcut,
  useNavigationBlock,
  useSessionGuard,
  useIsAdmin,
} from '@/shared/hooks';
import { copyTextToClipboard } from '@/shared/lib/clipboard';
import {
  buildDownloadFileName,
  downloadFromUrl,
  downloadTextFile,
  getFileExtensionFromUrl,
} from '@/shared/lib/file-download';

interface VoiceoverDetailContainerProps {
  voiceoverId: string;
}

export function VoiceoverDetailContainer({
  voiceoverId,
}: VoiceoverDetailContainerProps) {
  const { user } = useSessionGuard();

  const { data: voiceover } = useVoiceover(voiceoverId);

  const settings = useVoiceoverSettings({ voiceover });

  const { approve, revoke } = useApproveVoiceover(voiceoverId, user?.id);

  const actions = useVoiceoverActions({
    voiceoverId,
    voiceover,
    settings,
  });

  const isAdmin = useIsAdmin();
  const isApproved = voiceover.approvedBy !== null;

  const handleSave = useCallback(async () => {
    if (!settings.hasChanges) return;
    try {
      await settings.saveSettings();
      toast.success('Voiceover saved');
    } catch {
      // Error toast is handled by the mutation in useVoiceoverSettings
    }
  }, [settings]);

  useKeyboardShortcut({
    key: 's',
    cmdOrCtrl: true,
    onTrigger: handleSave,
    enabled: settings.hasChanges,
  });

  useKeyboardShortcut({
    key: 'Enter',
    cmdOrCtrl: true,
    onTrigger: actions.handleGenerate,
    enabled: actions.hasText && !actions.isGenerating,
  });

  useNavigationBlock({
    shouldBlock: actions.hasChanges && !actions.isGenerating,
  });

  const displayAudio = voiceover.audioUrl
    ? { url: voiceover.audioUrl, duration: voiceover.duration ?? null }
    : null;

  const workbenchState = {
    hasChanges: actions.hasChanges,
    hasText: actions.hasText,
    isGenerating: actions.isGenerating,
    isSaving: actions.isSaving,
    isDeleting: actions.isDeleting,
  };

  const approvalState = {
    isApproved,
    isAdmin,
    isApprovalPending: approve.isPending || revoke.isPending,
  };

  const canExportAudio = !!voiceover.audioUrl;
  const trimmedText = settings.text.trim();
  const canExportScript = trimmedText.length > 0;

  const handleExportAudio = useCallback(() => {
    if (!voiceover.audioUrl) return;
    const extension = getFileExtensionFromUrl(voiceover.audioUrl, 'mp3');
    const fileName = buildDownloadFileName({
      title: voiceover.title,
      extension,
      fallbackSlug: 'voiceover',
      labels: ['audio'],
      date: voiceover.updatedAt,
    });
    downloadFromUrl(voiceover.audioUrl, fileName);
  }, [voiceover.audioUrl, voiceover.title, voiceover.updatedAt]);

  const handleExportScript = useCallback(() => {
    if (!trimmedText) return;

    const script = buildVoiceoverTextExport({
      title: voiceover.title,
      text: settings.text,
      voice: settings.voice,
      voiceName: voiceover.voiceName,
    });
    const fileName = buildDownloadFileName({
      title: voiceover.title,
      extension: 'txt',
      fallbackSlug: 'voiceover',
      labels: ['script'],
      date: voiceover.updatedAt,
    });
    downloadTextFile(script, fileName);
  }, [
    trimmedText,
    settings.text,
    settings.voice,
    voiceover.title,
    voiceover.voiceName,
    voiceover.updatedAt,
  ]);

  const handleCopyTranscript = useCallback(async () => {
    if (!trimmedText) return;

    const transcript = buildVoiceoverTranscriptMarkdown({
      title: voiceover.title,
      text: settings.text,
      voice: settings.voice,
      voiceName: voiceover.voiceName,
    });

    try {
      const copied = await copyTextToClipboard(transcript);
      if (copied) {
        toast.success('Transcript copied');
      } else {
        toast.error('Clipboard not available');
      }
    } catch {
      toast.error('Failed to copy transcript');
    }
  }, [
    trimmedText,
    settings.text,
    settings.voice,
    voiceover.title,
    voiceover.voiceName,
  ]);

  return (
    <VoiceoverDetail
      voiceover={voiceover}
      settings={settings}
      displayAudio={displayAudio}
      assistantPanel={
        <WritingAssistantContainer
          voiceoverId={voiceoverId}
          manuscriptText={settings.text}
          onSetManuscriptText={settings.setText}
        />
      }
      workbenchState={workbenchState}
      approvalState={approvalState}
      onSave={handleSave}
      onGenerate={actions.handleGenerate}
      onDelete={actions.handleDelete}
      onApprove={() => approve.mutate({ id: voiceoverId })}
      onRevoke={() => revoke.mutate({ id: voiceoverId })}
      canExportAudio={canExportAudio}
      canExportScript={canExportScript}
      onExportAudio={handleExportAudio}
      onExportScript={handleExportScript}
      onCopyTranscript={handleCopyTranscript}
    />
  );
}
