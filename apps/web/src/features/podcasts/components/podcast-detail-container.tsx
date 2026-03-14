import { Suspense, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useApprovePodcast } from '../hooks/use-approve-podcast';
import { usePodcast } from '../hooks/use-podcast';
import { usePodcastActions } from '../hooks/use-podcast-actions';
import { usePodcastSettings } from '../hooks/use-podcast-settings';
import { useScriptEditor } from '../hooks/use-script-editor';
import { useSourceSelection } from '../hooks/use-source-selection';
import {
  buildPodcastScriptMarkdown,
  buildPodcastTranscriptMarkdown,
} from '../lib/export';
import { isSetupMode } from '../lib/status';
import { PodcastDetail } from './podcast-detail';
import { SetupWizard } from './setup';
import { WritingAssistantContainer } from './workbench/writing-assistant-container';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { UnsavedChangesDialog } from '@/shared/components/unsaved-changes-dialog';
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
} from '@/shared/lib/file-download';

interface PodcastDetailContainerProps {
  podcastId: string;
  userId?: string;
}

export function PodcastDetailContainer({
  podcastId,
  userId,
}: PodcastDetailContainerProps) {
  const { user } = useSessionGuard();

  const { data: podcast } = usePodcast(podcastId, { userId });

  const initialSegments = useMemo(
    () => [...(podcast.segments ?? [])],
    [podcast.segments],
  );

  const scriptEditor = useScriptEditor({
    podcastId,
    initialSegments,
  });

  const settings = usePodcastSettings({ podcast });

  const initialSources = useMemo(() => [...podcast.sources], [podcast.sources]);

  const sourceSelection = useSourceSelection({
    initialSources,
  });

  const actions = usePodcastActions({
    podcastId,
    podcast,
    scriptEditor,
    settings,
    sourceSelection,
  });

  const { approve, revoke } = useApprovePodcast(podcastId, user?.id);

  const isAdmin = useIsAdmin();
  const isApproved = podcast.approvedBy !== null;

  const navBlocker = useNavigationBlock({
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
  const scriptSegments = scriptEditor.segments;
  const canExportScript = scriptSegments.length > 0;

  const handleExportAudio = useCallback(() => {
    if (!podcast.audioUrl) return;
    const fileName = buildDownloadFileName({
      title: podcast.title,
      extension: 'wav',
      fallbackSlug: 'podcast',
      labels: ['audio'],
      date: podcast.updatedAt,
    });
    const downloadTask = Promise.resolve(
      downloadFromUrl(podcast.audioUrl, fileName),
    );
    void downloadTask.catch(() => {
      toast.error('Failed to download audio');
    });
  }, [podcast.audioUrl, podcast.title, podcast.updatedAt]);

  const handleExportScript = useCallback(() => {
    if (scriptSegments.length === 0) return;
    const markdown = buildPodcastScriptMarkdown({
      title: podcast.title,
      summary: podcast.summary ?? null,
      segments: scriptSegments,
    });
    const fileName = buildDownloadFileName({
      title: podcast.title,
      extension: 'md',
      fallbackSlug: 'podcast',
      labels: ['script'],
      date: podcast.updatedAt,
    });
    downloadTextFile(markdown, fileName, 'text/markdown;charset=utf-8');
  }, [podcast.summary, podcast.title, podcast.updatedAt, scriptSegments]);

  const handleCopyTranscript = useCallback(async () => {
    if (scriptSegments.length === 0) return;

    const transcript = buildPodcastTranscriptMarkdown({
      title: podcast.title,
      summary: podcast.summary ?? null,
      segments: scriptSegments,
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
  }, [podcast.summary, podcast.title, scriptSegments]);

  const [fullRegenerationConfirmOpen, setFullRegenerationConfirmOpen] =
    useState(false);
  const regenerationConfirmationDescription = sourceSelection.hasChanges
    ? 'This will regenerate your podcast script from scratch. Your current script edits will be replaced. New sources will be used to generate a fresh script and audio.'
    : 'This will regenerate your podcast script from scratch. Your current script edits will be replaced.';

  const handleSave = useCallback(() => {
    if (actions.needsFullRegeneration) {
      setFullRegenerationConfirmOpen(true);
      return;
    }
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
        <SetupWizard podcast={podcast} />
      </Suspense>
    );
  }

  return (
    <>
      <PodcastDetail
        podcast={podcast}
        userId={userId}
        scriptEditor={scriptEditor}
        settings={settings}
        sourceSelection={sourceSelection}
        displayAudio={displayAudio}
        assistantPanel={
          <WritingAssistantContainer
            podcastId={podcastId}
            format={podcast.format}
            segments={scriptEditor.segments}
            onReplaceSegments={scriptEditor.replaceSegments}
          />
        }
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
        onConfirm={() => {
          setFullRegenerationConfirmOpen(false);
          void actions.handleSave();
        }}
      />
      <UnsavedChangesDialog blocker={navBlocker} />
    </>
  );
}
