// Container: Fetches document + content, manages state, coordinates actions

import { DocumentStatus } from '@repo/db/schema';
import { useCallback, useState } from 'react';
import { useDocument, useDocumentContentOptional } from '../hooks/use-document';
import { useDocumentActions } from '../hooks/use-document-actions';
import { useDocumentSearch } from '../hooks/use-document-search';
import { useRetryProcessing } from '../hooks/use-retry-processing';
import {
  buildDocumentMarkdownExport,
  buildDocumentTextExport,
} from '../lib/export';
import { DocumentDetail } from './document-detail';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { useKeyboardShortcut, useNavigationBlock } from '@/shared/hooks';
import { downloadTextFile, toFileSlug } from '@/shared/lib/file-download';

interface DocumentDetailContainerProps {
  documentId: string;
}

export function DocumentDetailContainer({
  documentId,
}: DocumentDetailContainerProps) {
  const { data: document } = useDocument(documentId);

  // Only fetch content when document is ready (hook always called, `enabled` controls fetching)
  const isReady = document.status === DocumentStatus.READY;
  const { data: contentData } = useDocumentContentOptional(documentId, isReady);
  const documentContent = contentData?.content ?? null;

  const actions = useDocumentActions({ document });
  const search = useDocumentSearch(documentContent ?? '');
  const retryMutation = useRetryProcessing();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const canExport = isReady && !!documentContent?.trim();

  const handleExportMarkdown = useCallback(() => {
    if (!documentContent) return;

    const exportTitle = actions.title.trim() || document.title;
    const markdown = buildDocumentMarkdownExport({
      document,
      title: exportTitle,
      content: documentContent,
    });
    const fileName = `${toFileSlug(exportTitle, 'document')}.md`;
    downloadTextFile(markdown, fileName, 'text/markdown;charset=utf-8');
  }, [actions.title, document, documentContent]);

  const handleExportText = useCallback(() => {
    if (!documentContent) return;

    const exportTitle = actions.title.trim() || document.title;
    const text = buildDocumentTextExport({
      document,
      title: exportTitle,
      content: documentContent,
    });
    const fileName = `${toFileSlug(exportTitle, 'document')}.txt`;
    downloadTextFile(text, fileName);
  }, [actions.title, document, documentContent]);

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
        onExportMarkdown={handleExportMarkdown}
        onExportText={handleExportText}
      />
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone. Any podcasts or voiceovers using this document will not be affected."
        confirmText="Delete"
        variant="destructive"
        isLoading={actions.isDeleting}
        onConfirm={actions.handleDelete}
      />
    </>
  );
}
