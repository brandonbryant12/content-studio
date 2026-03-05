// Presenter: Pure UI for source detail view

import {
  ArrowLeftIcon,
  DownloadIcon,
  InfoCircledIcon,
  MagnifyingGlassIcon,
  Pencil1Icon,
  TrashIcon,
} from '@radix-ui/react-icons';
import { SourceStatus } from '@repo/api/contracts';
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
import type { SourceDetailSource } from './source-detail-types';
import type { UseSourceSearchReturn } from '../hooks/use-source-search';
import {
  buildMatchesByParagraph,
  SourceContentReader,
  SourceFailedState,
  SourceProcessingState,
} from './source-detail-content';
import { SourceDetailSearchBar } from './source-detail-search-bar';
import {
  SourceMetadataBar,
  SourceOriginCallout,
} from './source-detail-source-sections';
import { SourceDetailUnsavedChangesBar } from './source-detail-unsaved-changes-bar';
import { SourceIcon } from './source-icon';
import {
  SOURCE_DEFINITION,
  SOURCE_DETAIL_HELP,
} from '@/shared/lib/source-guidance';

interface SourceDetailProps {
  source: SourceDetailSource;
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
  search: UseSourceSearchReturn;
  canExport?: boolean;
  canCreateFromSource?: boolean;
  isCreatingVoiceover?: boolean;
  isCreatingInfographic?: boolean;
  onCreateVoiceover?: () => void;
  onCreateInfographic?: () => void;
  onExportMarkdown?: () => void;
  onExportText?: () => void;
}

export function SourceDetail({
  source,
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
  canCreateFromSource = false,
  isCreatingVoiceover = false,
  isCreatingInfographic = false,
  onCreateVoiceover,
  onCreateInfographic,
  onExportMarkdown,
  onExportText,
}: SourceDetailProps) {
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
              to="/sources"
              className="workbench-back-btn"
              aria-label="Back to sources"
            >
              <ArrowLeftIcon />
            </Link>

            <div className="workbench-title-group">
              <SourceIcon source={source.source} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Input
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    className="workbench-title-input"
                    aria-label="Source title"
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
                    disabled={!canCreateFromSource || isCreatingVoiceover}
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
                    disabled={!canCreateFromSource || isCreatingInfographic}
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
                  aria-label="Search in source"
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
                      aria-label="Export source"
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
                  aria-label={`Delete ${source.title}`}
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

      <SourceDetailSearchBar search={search} />

      <div className="workbench-main">
        <div className="workbench-scroll-container">
          <div className="doc-reader-wrapper">
            <div className="doc-reader-surface">
              <div className="mb-6 rounded-xl border border-emerald-200/60 bg-emerald-50/70 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-300">
                    <InfoCircledIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      How this source is used
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {SOURCE_DEFINITION}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {SOURCE_DETAIL_HELP}
                    </p>
                  </div>
                </div>
              </div>
              <SourceMetadataBar source={source} />
              <SourceOriginCallout source={source} />

              {source.status === SourceStatus.PROCESSING && (
                <SourceProcessingState source={source.source} />
              )}

              {source.status === SourceStatus.FAILED && (
                <SourceFailedState
                  errorMessage={source.errorMessage}
                  onRetry={onRetry}
                  isRetrying={isRetrying}
                />
              )}

              {source.status === SourceStatus.READY && (
                <SourceContentReader
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
        <SourceDetailUnsavedChangesBar
          isSaving={isSaving}
          title={title}
          onDiscard={onDiscard}
          onSave={onSave}
        />
      )}
    </div>
  );
}
