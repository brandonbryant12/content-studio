import { Suspense, useCallback } from 'react';
import { useApprovePodcast } from '../hooks/use-approve-podcast';
import { useDocumentSelection } from '../hooks/use-document-selection';
import { usePodcast } from '../hooks/use-podcast';
import { usePodcastActions } from '../hooks/use-podcast-actions';
import { usePodcastSettings } from '../hooks/use-podcast-settings';
import { useScriptEditor } from '../hooks/use-script-editor';
import { isSetupMode } from '../lib/status';
import { PodcastDetail } from './podcast-detail';
import { SetupWizardContainer } from './setup-wizard-container';
import {
  useKeyboardShortcut,
  useNavigationBlock,
  useSessionGuard,
} from '@/shared/hooks';

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

  const { approve, revoke } = useApprovePodcast(podcastId, currentUserId);

  const isAdmin = (user as { role?: string } | undefined)?.role === 'admin';
  const isApproved = podcast.approvedBy !== null;

  const handleApprove = useCallback(() => {
    approve.mutate({ id: podcastId });
  }, [approve, podcastId]);

  const handleRevoke = useCallback(() => {
    revoke.mutate({ id: podcastId });
  }, [revoke, podcastId]);

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
      isApproved={isApproved}
      isAdmin={isAdmin}
      onApprove={handleApprove}
      onRevoke={handleRevoke}
      isApprovalPending={approve.isPending || revoke.isPending}
    />
  );
}
