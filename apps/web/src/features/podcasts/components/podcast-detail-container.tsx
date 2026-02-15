import { Suspense, useMemo } from 'react';
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
import { useIsAdmin } from '@/shared/hooks/use-is-admin';

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

  useKeyboardShortcut({
    key: 's',
    cmdOrCtrl: true,
    onTrigger: actions.handleSave,
    enabled: actions.hasAnyChanges,
  });

  useNavigationBlock({
    shouldBlock: actions.hasAnyChanges && !actions.isGenerating,
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

  return (
    <PodcastDetail
      podcast={podcast}
      scriptEditor={scriptEditor}
      settings={settings}
      documentSelection={documentSelection}
      displayAudio={displayAudio}
      workbenchState={workbenchState}
      approvalState={approvalState}
      onSave={actions.handleSave}
      onGenerate={actions.handleGenerate}
      onDelete={actions.handleDelete}
      onApprove={() => approve.mutate({ id: podcastId })}
      onRevoke={() => revoke.mutate({ id: podcastId })}
    />
  );
}
