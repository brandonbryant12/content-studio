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
import { UnsavedChangesDialog } from '@/shared/components/unsaved-changes-dialog';
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
} from '@/shared/lib/file-download';

interface VoiceoverDetailContainerProps {
  voiceoverId: string;
  userId?: string;
}

export function VoiceoverDetailContainer({
  voiceoverId,
  userId,
}: VoiceoverDetailContainerProps) {
  const { user } = useSessionGuard();

  const { data: voiceover } = useVoiceover(voiceoverId, { userId });

  const settings = useVoiceoverSettings({ voiceover });

  const { approve, revoke } = useApproveVoiceover(voiceoverId, user?.id);

  const actions = useVoiceoverActions({
    voiceoverId,
    voiceover,
    settings,
  });

  const isAdmin = useIsAdmin();
  const isApproved = voiceover.approvedBy !== null;

  useKeyboardShortcut({
    key: 'Enter',
    cmdOrCtrl: true,
    onTrigger: actions.handleGenerate,
    enabled: actions.hasText && !actions.isGenerating,
  });

  const navBlocker = useNavigationBlock({
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
  const buildVoiceoverFileName = useCallback(
    (extension: string, labels: string[]) =>
      buildDownloadFileName({
        title: voiceover.title,
        extension,
        fallbackSlug: 'voiceover',
        labels,
        date: voiceover.updatedAt,
      }),
    [voiceover.title, voiceover.updatedAt],
  );
  const getScriptExportContext = useCallback(() => {
    if (!trimmedText) return null;
    return {
      title: voiceover.title,
      text: settings.text,
      voice: settings.voice,
      voiceName: voiceover.voiceName,
    };
  }, [
    trimmedText,
    voiceover.title,
    voiceover.voiceName,
    settings.text,
    settings.voice,
  ]);

  const handleExportAudio = useCallback(() => {
    if (!voiceover.audioUrl) return;
    const fileName = buildVoiceoverFileName('wav', ['audio']);
    const downloadTask = Promise.resolve(
      downloadFromUrl(voiceover.audioUrl, fileName),
    );
    void downloadTask.catch(() => {
      toast.error('Failed to download audio');
    });
  }, [voiceover.audioUrl, buildVoiceoverFileName]);

  const handleExportScript = useCallback(() => {
    const context = getScriptExportContext();
    if (!context) return;

    const script = buildVoiceoverTextExport(context);
    const fileName = buildVoiceoverFileName('txt', ['script']);
    downloadTextFile(script, fileName);
  }, [getScriptExportContext, buildVoiceoverFileName]);

  const handleCopyTranscript = useCallback(async () => {
    const context = getScriptExportContext();
    if (!context) return;
    const transcript = buildVoiceoverTranscriptMarkdown(context);

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
  }, [getScriptExportContext]);

  const handleApprove = useCallback(() => {
    approve.mutate({ id: voiceoverId });
  }, [approve, voiceoverId]);

  const handleRevoke = useCallback(() => {
    revoke.mutate({ id: voiceoverId });
  }, [revoke, voiceoverId]);

  return (
    <>
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
        onGenerate={actions.handleGenerate}
        onDelete={actions.handleDelete}
        onApprove={handleApprove}
        onRevoke={handleRevoke}
        canExportAudio={canExportAudio}
        canExportScript={canExportScript}
        onExportAudio={handleExportAudio}
        onExportScript={handleExportScript}
        onCopyTranscript={handleCopyTranscript}
      />
      <UnsavedChangesDialog blocker={navBlocker} />
    </>
  );
}
