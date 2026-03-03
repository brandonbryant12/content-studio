// Presenter: Pure UI for document detail view

import {
  ArrowLeftIcon,
  DownloadIcon,
  MagnifyingGlassIcon,
  Pencil1Icon,
  TrashIcon,
} from '@radix-ui/react-icons';
import { DocumentStatus } from '@repo/api/contracts';
import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Input } from '@repo/ui/components/input';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import type { DocumentDetailDocument } from './document-detail-types';
import type { UseDocumentSearchReturn } from '../hooks/use-document-search';
import {
  buildMatchesByParagraph,
  DocumentContentReader,
  DocumentFailedState,
  DocumentProcessingState,
} from './document-detail-content';
import { DocumentDetailSearchBar } from './document-detail-search-bar';
import {
  DocumentMetadataBar,
  DocumentSourceCallout,
} from './document-detail-source-sections';
import { DocumentDetailUnsavedChangesBar } from './document-detail-unsaved-changes-bar';
import { DocumentIcon } from './document-icon';

interface DocumentDetailProps {
  document: DocumentDetailDocument;
  content: string | null;
  title: string;
  onTitleChange: (title: string) => void;
  hasChanges: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isRetrying: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onDeleteRequest: () => void;
  onRetry: () => void;
  search: UseDocumentSearchReturn;
  canExport?: boolean;
  canCreateFromDocument?: boolean;
  isCreatingVoiceover?: boolean;
  isCreatingInfographic?: boolean;
  onCreateVoiceover?: () => void;
  onCreateInfographic?: () => void;
  onExportMarkdown?: () => void;
  onExportText?: () => void;
}

export function DocumentDetail({
  document,
  content,
  title,
  onTitleChange,
  hasChanges,
  isSaving,
  isDeleting,
  isRetrying,
  onSave,
  onDiscard,
  onDeleteRequest,
  onRetry,
  search,
  canExport = false,
  canCreateFromDocument = false,
  isCreatingVoiceover = false,
  isCreatingInfographic = false,
  onCreateVoiceover,
  onCreateInfographic,
  onExportMarkdown,
  onExportText,
}: DocumentDetailProps) {
  const handleExportMarkdown = onExportMarkdown ?? (() => {});
  const handleExportText = onExportText ?? (() => {});

  const paragraphs = useMemo(
    () => (content ? content.split('\n') : []),
    [content],
  );

  const matchesByParagraph = useMemo(
    () => buildMatchesByParagraph(search.matches),
    [search.matches],
  );

  return (
    <div className="workbench">
      {/* Header */}
      <header className="workbench-header">
        <div className="workbench-header-content">
          <div className="workbench-header-row">
            <Link
              to="/documents"
              className="workbench-back-btn"
              aria-label="Back to documents"
            >
              <ArrowLeftIcon />
            </Link>

            <div className="workbench-title-group">
              <DocumentIcon source={document.source} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Input
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    className="workbench-title-input"
                    aria-label="Document title"
                  />
                  {hasChanges && (
                    <Pencil1Icon
                      className="w-3.5 h-3.5 text-primary shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="workbench-meta">
              <div className="workbench-actions">
                {onCreateVoiceover && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCreateVoiceover}
                    disabled={!canCreateFromDocument || isCreatingVoiceover}
                  >
                    {isCreatingVoiceover ? (
                      <>
                        <Spinner className="w-4 h-4 mr-2" />
                        Creating...
                      </>
                    ) : (
                      'Create Voiceover'
                    )}
                  </Button>
                )}
                {onCreateInfographic && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCreateInfographic}
                    disabled={!canCreateFromDocument || isCreatingInfographic}
                  >
                    {isCreatingInfographic ? (
                      <>
                        <Spinner className="w-4 h-4 mr-2" />
                        Creating...
                      </>
                    ) : (
                      'Create Infographic'
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={search.isOpen ? search.close : search.open}
                  className={search.isOpen ? 'text-primary' : ''}
                  aria-label="Search in document"
                  aria-pressed={search.isOpen}
                >
                  <MagnifyingGlassIcon className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!canExport}
                      aria-label="Export document"
                    >
                      <DownloadIcon className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={handleExportMarkdown}
                      disabled={!canExport || !onExportMarkdown}
                    >
                      Download Markdown
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleExportText}
                      disabled={!canExport || !onExportText}
                    >
                      Download Text
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDeleteRequest}
                  disabled={isDeleting}
                  className="workbench-delete-btn"
                  aria-label={`Delete ${document.title}`}
                >
                  {isDeleting ? (
                    <Spinner className="w-4 h-4" />
                  ) : (
                    <TrashIcon className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <DocumentDetailSearchBar search={search} />

      <div className="workbench-main">
        <div className="workbench-scroll-container">
          <div className="doc-reader-wrapper">
            <div className="doc-reader-surface">
              <DocumentMetadataBar document={document} />
              <DocumentSourceCallout document={document} />

              {document.status === DocumentStatus.PROCESSING && (
                <DocumentProcessingState source={document.source} />
              )}

              {document.status === DocumentStatus.FAILED && (
                <DocumentFailedState
                  errorMessage={document.errorMessage}
                  onRetry={onRetry}
                  isRetrying={isRetrying}
                />
              )}

              {document.status === DocumentStatus.READY && (
                <DocumentContentReader
                  content={content}
                  paragraphs={paragraphs}
                  queryLength={search.query.length}
                  matchCount={search.matches.length}
                  currentMatchIndex={search.currentMatchIndex}
                  matchesByParagraph={matchesByParagraph}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {hasChanges && (
        <DocumentDetailUnsavedChangesBar
          isSaving={isSaving}
          title={title}
          onDiscard={onDiscard}
          onSave={onSave}
        />
      )}
    </div>
  );
}
