import { Suspense, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useApprovePodcast } from '../hooks/use-approve-podcast';
import { useDocumentSelection } from '../hooks/use-document-selection';
import { usePodcast } from '../hooks/use-podcast';
import { usePodcastActions } from '../hooks/use-podcast-actions';
import { usePodcastSettings } from '../hooks/use-podcast-settings';
import { useScriptEditor } from '../hooks/use-script-editor';
import {
  buildPodcastScriptMarkdown,
  buildPodcastTranscriptMarkdown,
} from '../lib/export';
import { isSetupMode } from '../lib/status';
import { PodcastDetail } from './podcast-detail';
import { SetupWizardContainer } from './setup-wizard-container';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import {
  useKeyboardShortcut,
  useNavigationBlock,
  useSessionGuard,
} from '@/shared/hooks';
import { useIsAdmin } from '@/shared/hooks/use-is-admin';
import { copyTextToClipboard } from '@/shared/lib/clipboard';
import {
  buildDownloadFileName,
  downloadFromUrl,
  downloadTextFile,
  getFileExtensionFromUrl,
} from '@/shared/lib/file-download';

interface PodcastDetailContainerProps {
  podcastId: string;
}

export function PodcastDetailContainer({
  podcastId,
}: PodcastDetailContainerProps) {
  const { user } = useSessionGuard();
  const currentUserId = user?.id ?? '';

  const { data: podcast } = usePodcast(podcastId);

  const initialSegments = useMemo(
    () => [...(podcast.segments ?? [])],
    [podcast.segments],
  );

  const scriptEditor = useScriptEditor({
    podcastId,
    initialSegments,
  });

  const settings = usePodcastSettings({ podcast });

  const initialDocuments = useMemo(
    () => [...(podcast.documents ?? [])],
    [podcast.documents],
  );

  const documentSelection = useDocumentSelection({
    initialDocuments,
  });

  const actions = usePodcastActions({
    podcastId,
    podcast,
    scriptEditor,
    settings,
    documentSelection,
  });

  const { approve, revoke } = useApprovePodcast(podcastId, currentUserId);

  const isAdmin = useIsAdmin();
  const isApproved = podcast.approvedBy !== null;

  useNavigationBlock({
    shouldBlock: actions.hasAnyChanges && !actions.isGenerating,
  });

  const displayAudio = podcast.audioUrl
    ? {
        url: podcast.audioUrl,
        duration: podcast.duration ?? null,
      }
    : null;

  const workbenchState = {
    hasChanges: actions.hasAnyChanges,
    isGenerating: actions.isGenerating,
    isPendingGeneration: actions.isPendingGeneration,
    isSaving: actions.isSaving,
    isDeleting: actions.isDeleting,
  };

  const approvalState = {
    isApproved,
    isAdmin,
    isApprovalPending: approve.isPending || revoke.isPending,
  };

  const canExportAudio = !!podcast.audioUrl;
  const canExportScript = scriptEditor.segments.length > 0;

  const handleExportAudio = useCallback(() => {
    if (!podcast.audioUrl) return;
    const extension = getFileExtensionFromUrl(podcast.audioUrl, 'mp3');
    const fileName = buildDownloadFileName({
      title: podcast.title,
      extension,
      fallbackSlug: 'podcast',
      labels: ['audio'],
      date: podcast.updatedAt,
    });
    downloadFromUrl(podcast.audioUrl, fileName);
  }, [podcast.audioUrl, podcast.title, podcast.updatedAt]);

  const handleExportScript = useCallback(() => {
    if (scriptEditor.segments.length === 0) return;
    const markdown = buildPodcastScriptMarkdown({
      title: podcast.title,
      summary: podcast.summary ?? null,
      segments: scriptEditor.segments,
    });
    const fileName = buildDownloadFileName({
      title: podcast.title,
      extension: 'md',
      fallbackSlug: 'podcast',
      labels: ['script'],
      date: podcast.updatedAt,
    });
    downloadTextFile(markdown, fileName, 'text/markdown;charset=utf-8');
  }, [
    podcast.summary,
    podcast.title,
    podcast.updatedAt,
    scriptEditor.segments,
  ]);

  const handleCopyTranscript = useCallback(async () => {
    if (scriptEditor.segments.length === 0) return;

    const transcript = buildPodcastTranscriptMarkdown({
      title: podcast.title,
      summary: podcast.summary ?? null,
      segments: scriptEditor.segments,
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
  }, [podcast.summary, podcast.title, scriptEditor.segments]);

  const [fullRegenerationConfirmOpen, setFullRegenerationConfirmOpen] =
    useState(false);
  const regenerationConfirmationDescription = documentSelection.hasChanges
    ? 'This will regenerate your podcast script from scratch. Your current script edits will be replaced. New source documents will be used to generate a fresh script and audio.'
    : 'This will regenerate your podcast script from scratch. Your current script edits will be replaced.';

  const handleSave = useCallback(() => {
    if (actions.needsFullRegeneration) {
      setFullRegenerationConfirmOpen(true);
      return;
    }
    void actions.handleSave();
  }, [actions]);

  const handleConfirmFullRegeneration = useCallback(() => {
    setFullRegenerationConfirmOpen(false);
    void actions.handleSave();
  }, [actions]);

  useKeyboardShortcut({
    key: 's',
    cmdOrCtrl: true,
    onTrigger: handleSave,
    enabled: actions.hasAnyChanges,
  });

  if (isSetupMode(podcast)) {
    return (
      <Suspense fallback={null}>
        <SetupWizardContainer podcast={podcast} />
      </Suspense>
    );
  }

  return (
    <>
      <PodcastDetail
        podcast={podcast}
        scriptEditor={scriptEditor}
        settings={settings}
        documentSelection={documentSelection}
        displayAudio={displayAudio}
        workbenchState={workbenchState}
        approvalState={approvalState}
        onSave={handleSave}
        onGenerate={actions.handleGenerate}
        onDelete={actions.handleDelete}
        onApprove={() => approve.mutate({ id: podcastId })}
        onRevoke={() => revoke.mutate({ id: podcastId })}
        canExportAudio={canExportAudio}
        canExportScript={canExportScript}
        onExportAudio={handleExportAudio}
        onExportScript={handleExportScript}
        onCopyTranscript={handleCopyTranscript}
      />
      <ConfirmationDialog
        open={fullRegenerationConfirmOpen}
        onOpenChange={setFullRegenerationConfirmOpen}
        title="Regenerate podcast from scratch?"
        description={regenerationConfirmationDescription}
        confirmText="Regenerate"
        variant="destructive"
        isLoading={actions.isSaving}
        onConfirm={handleConfirmFullRegeneration}
      />
    </>
  );
}
