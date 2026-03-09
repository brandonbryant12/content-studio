// Container: Fetches source + content, manages state, coordinates actions

import { SourceStatus } from '@repo/api/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useRetryProcessing } from '../hooks/use-retry-processing';
import { useSource, useSourceContentOptional } from '../hooks/use-source';
import { useSourceActions } from '../hooks/use-source-actions';
import { useSourceSearch } from '../hooks/use-source-search';
import {
  buildSourceMarkdownExport,
  buildSourceTextExport,
} from '../lib/export';
import { SourceDetail } from './source-detail';
import { apiClient } from '@/clients/apiClient';
import { getInfographicListQueryKey } from '@/features/infographics/hooks/use-infographic-list';
import { getVoiceoverListQueryKey } from '@/features/voiceovers/hooks/use-voiceover-list';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { UnsavedChangesDialog } from '@/shared/components/unsaved-changes-dialog';
import { useKeyboardShortcut, useNavigationBlock } from '@/shared/hooks';
import { getErrorMessage } from '@/shared/lib/errors';
import { downloadTextFile, toFileSlug } from '@/shared/lib/file-download';

interface SourceDetailContainerProps {
  sourceId: string;
}

export function SourceDetailContainer({
  sourceId,
}: SourceDetailContainerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: source } = useSource(sourceId);

  // Only fetch content when source is ready (hook always called, `enabled` controls fetching)
  const isReady = source.status === SourceStatus.READY;
  const { data: contentData } = useSourceContentOptional(sourceId, isReady);
  const sourceContent = contentData?.content ?? null;
  const sourceContentText = sourceContent ?? '';

  const actions = useSourceActions({ source });
  const search = useSourceSearch(sourceContentText);
  const retryMutation = useRetryProcessing();
  const handleCreateError = useCallback(
    (fallbackMessage: string, error: unknown) => {
      toast.error(getErrorMessage(error, fallbackMessage));
    },
    [],
  );
  const getExportContext = useCallback(() => {
    if (!sourceContent) return null;
    return {
      exportTitle: actions.title.trim() || source.title,
      content: sourceContent,
    };
  }, [actions.title, source.title, sourceContent]);

  const createVoiceoverMutation = useMutation(
    apiClient.voiceovers.create.mutationOptions({
      onSuccess: (created) => {
        queryClient.invalidateQueries({
          queryKey: getVoiceoverListQueryKey(),
        });
        navigate({
          to: '/voiceovers/$voiceoverId',
          params: { voiceoverId: created.id },
        });
      },
      onError: (error) => {
        handleCreateError('Failed to create voiceover', error);
      },
    }),
  );
  const createInfographicMutation = useMutation(
    apiClient.infographics.create.mutationOptions({
      onSuccess: (created) => {
        queryClient.invalidateQueries({
          queryKey: getInfographicListQueryKey(),
        });
        navigate({
          to: '/infographics/$infographicId',
          params: { infographicId: created.id },
        });
      },
      onError: (error) => {
        handleCreateError('Failed to create infographic', error);
      },
    }),
  );

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const canExport = isReady && sourceContentText.trim().length > 0;

  const handleExportMarkdown = useCallback(() => {
    const context = getExportContext();
    if (!context) return;

    const markdown = buildSourceMarkdownExport({
      source,
      title: context.exportTitle,
      content: context.content,
    });
    const fileName = `${toFileSlug(context.exportTitle, 'source')}.md`;
    downloadTextFile(markdown, fileName, 'text/markdown;charset=utf-8');
  }, [source, getExportContext]);

  const handleExportText = useCallback(() => {
    const context = getExportContext();
    if (!context) return;

    const text = buildSourceTextExport({
      source,
      title: context.exportTitle,
      content: context.content,
    });
    const fileName = `${toFileSlug(context.exportTitle, 'source')}.txt`;
    downloadTextFile(text, fileName);
  }, [source, getExportContext]);

  const handleCreatePodcast = useCallback(() => {
    navigate({ to: '/podcasts/new', search: { sourceId: source.id } });
  }, [navigate, source.id]);

  const handleCreateVoiceover = useCallback(() => {
    createVoiceoverMutation.mutate({
      title: `Voiceover: ${source.title}`,
      sourceId: source.id,
    });
  }, [createVoiceoverMutation, source.id, source.title]);

  const handleCreateInfographic = useCallback(() => {
    createInfographicMutation.mutate({
      title: `Infographic: ${source.title}`,
      format: 'portrait',
      sourceId: source.id,
    });
  }, [createInfographicMutation, source.id, source.title]);

  useKeyboardShortcut({
    key: 's',
    cmdOrCtrl: true,
    onTrigger: actions.handleSave,
    enabled: actions.hasChanges,
  });

  useKeyboardShortcut({
    key: 'f',
    cmdOrCtrl: true,
    onTrigger: search.open,
  });

  const navBlocker = useNavigationBlock({
    shouldBlock: actions.hasChanges,
  });

  return (
    <>
      <SourceDetail
        source={source}
        content={sourceContent}
        title={actions.title}
        onTitleChange={actions.setTitle}
        hasChanges={actions.hasChanges}
        isSaving={actions.isSaving}
        isDeleting={actions.isDeleting}
        isRetrying={retryMutation.isPending}
        onSave={actions.handleSave}
        onDiscard={actions.discardChanges}
        onDeleteRequest={() => setIsDeleteDialogOpen(true)}
        onRetry={() => retryMutation.mutate({ id: sourceId })}
        search={search}
        canExport={canExport}
        canCreateFromSource={isReady}
        isCreatingVoiceover={createVoiceoverMutation.isPending}
        isCreatingInfographic={createInfographicMutation.isPending}
        onCreatePodcast={handleCreatePodcast}
        onCreateVoiceover={handleCreateVoiceover}
        onCreateInfographic={handleCreateInfographic}
        onExportMarkdown={handleExportMarkdown}
        onExportText={handleExportText}
      />
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Source"
        description={`Are you sure you want to delete "${source.title}"? This action cannot be undone. Any podcasts or voiceovers using this source will not be affected.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={actions.isDeleting}
        onConfirm={actions.handleDelete}
      />
      <UnsavedChangesDialog blocker={navBlocker} />
    </>
  );
}
