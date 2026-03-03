// Container: Fetches document + content, manages state, coordinates actions

import { DocumentStatus } from '@repo/api/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useDocument, useDocumentContentOptional } from '../hooks/use-document';
import { useDocumentActions } from '../hooks/use-document-actions';
import { useDocumentSearch } from '../hooks/use-document-search';
import { useRetryProcessing } from '../hooks/use-retry-processing';
import {
  buildDocumentMarkdownExport,
  buildDocumentTextExport,
} from '../lib/export';
import { DocumentDetail } from './document-detail';
import { apiClient } from '@/clients/apiClient';
import { getInfographicListQueryKey } from '@/features/infographics/hooks/use-infographic-list';
import { getVoiceoverListQueryKey } from '@/features/voiceovers/hooks/use-voiceover-list';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { useKeyboardShortcut, useNavigationBlock } from '@/shared/hooks';
import { getErrorMessage } from '@/shared/lib/errors';
import { downloadTextFile, toFileSlug } from '@/shared/lib/file-download';

interface DocumentDetailContainerProps {
  documentId: string;
}

export function DocumentDetailContainer({
  documentId,
}: DocumentDetailContainerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: document } = useDocument(documentId);

  // Only fetch content when document is ready (hook always called, `enabled` controls fetching)
  const isReady = document.status === DocumentStatus.READY;
  const { data: contentData } = useDocumentContentOptional(documentId, isReady);
  const documentContent = contentData?.content ?? null;
  const documentContentText = documentContent ?? '';

  const actions = useDocumentActions({ document });
  const search = useDocumentSearch(documentContentText);
  const retryMutation = useRetryProcessing();
  const handleCreateError = useCallback(
    (fallbackMessage: string, error: unknown) => {
      toast.error(getErrorMessage(error, fallbackMessage));
    },
    [],
  );
  const getExportContext = useCallback(() => {
    if (!documentContent) return null;
    return {
      exportTitle: actions.title.trim() || document.title,
      content: documentContent,
    };
  }, [actions.title, document.title, documentContent]);

  const createVoiceoverMutation = useMutation(
    apiClient.voiceovers.create.mutationOptions({
      onSuccess: (created) => {
        queryClient.invalidateQueries({
          queryKey: getVoiceoverListQueryKey(),
        });
        toast.success('Voiceover created');
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
        toast.success('Infographic created');
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
  const canExport = isReady && documentContentText.trim().length > 0;

  const handleExportMarkdown = useCallback(() => {
    const context = getExportContext();
    if (!context) return;

    const markdown = buildDocumentMarkdownExport({
      document,
      title: context.exportTitle,
      content: context.content,
    });
    const fileName = `${toFileSlug(context.exportTitle, 'document')}.md`;
    downloadTextFile(markdown, fileName, 'text/markdown;charset=utf-8');
  }, [document, getExportContext]);

  const handleExportText = useCallback(() => {
    const context = getExportContext();
    if (!context) return;

    const text = buildDocumentTextExport({
      document,
      title: context.exportTitle,
      content: context.content,
    });
    const fileName = `${toFileSlug(context.exportTitle, 'document')}.txt`;
    downloadTextFile(text, fileName);
  }, [document, getExportContext]);

  const handleCreateVoiceover = useCallback(() => {
    createVoiceoverMutation.mutate({
      title: `Voiceover: ${document.title}`,
      documentId: document.id,
    });
  }, [createVoiceoverMutation, document.id, document.title]);

  const handleCreateInfographic = useCallback(() => {
    createInfographicMutation.mutate({
      title: `Infographic: ${document.title}`,
      format: 'portrait',
      documentId: document.id,
    });
  }, [createInfographicMutation, document.id, document.title]);

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

  useNavigationBlock({
    shouldBlock: actions.hasChanges,
  });

  return (
    <>
      <DocumentDetail
        document={document}
        content={documentContent}
        title={actions.title}
        onTitleChange={actions.setTitle}
        hasChanges={actions.hasChanges}
        isSaving={actions.isSaving}
        isDeleting={actions.isDeleting}
        isRetrying={retryMutation.isPending}
        onSave={actions.handleSave}
        onDiscard={actions.discardChanges}
        onDeleteRequest={() => setIsDeleteDialogOpen(true)}
        onRetry={() => retryMutation.mutate({ id: documentId })}
        search={search}
        canExport={canExport}
        canCreateFromDocument={isReady}
        isCreatingVoiceover={createVoiceoverMutation.isPending}
        isCreatingInfographic={createInfographicMutation.isPending}
        onCreateVoiceover={handleCreateVoiceover}
        onCreateInfographic={handleCreateInfographic}
        onExportMarkdown={handleExportMarkdown}
        onExportText={handleExportText}
      />
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Document"
        description={`Are you sure you want to delete "${document.title}"? This action cannot be undone. Any podcasts or voiceovers using this document will not be affected.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={actions.isDeleting}
        onConfirm={actions.handleDelete}
      />
    </>
  );
}
