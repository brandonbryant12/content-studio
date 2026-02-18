import { ArrowLeftIcon, DownloadIcon, TrashIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { useState, useCallback, type ReactNode } from 'react';
import type { RouterOutput } from '@repo/api/client';
import { isGeneratingStatus } from '../../lib/status';
import { VoiceoverIcon } from '../voiceover-icon';
import { ApproveButton } from '@/shared/components/approval/approve-button';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { formatDuration } from '@/shared/lib/formatters';

type VoiceoverFull = RouterOutput['voiceovers']['get'];

interface WorkbenchLayoutProps {
  voiceover: VoiceoverFull;
  children: ReactNode;
  rightPanel?: ReactNode;
  actionBar?: ReactNode;
  onDelete: () => void;
  isDeleting: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  onApprove: () => void;
  onRevoke: () => void;
  isApprovalPending: boolean;
  canExportAudio?: boolean;
  canExportScript?: boolean;
  onExportAudio?: () => void;
  onExportScript?: () => void;
  onCopyTranscript?: () => void;
}

export function WorkbenchLayout({
  voiceover,
  children,
  rightPanel,
  actionBar,
  onDelete,
  isDeleting,
  isApproved,
  isAdmin,
  onApprove,
  onRevoke,
  isApprovalPending,
  canExportAudio = false,
  canExportScript = false,
  onExportAudio,
  onExportScript,
  onCopyTranscript,
}: WorkbenchLayoutProps) {
  const isGenerating = isGeneratingStatus(voiceover.status);
  const canExport = canExportAudio || canExportScript;
  const handleExportAudio = onExportAudio ?? (() => {});
  const handleExportScript = onExportScript ?? (() => {});
  const handleCopyTranscript = onCopyTranscript ?? (() => {});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleDeleteClick = useCallback(() => {
    setDeleteConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    setDeleteConfirmOpen(false);
    onDelete();
  }, [onDelete]);

  return (
    <>
      <div className="workbench">
        {/* Header */}
        <header className="workbench-header">
          <div className="workbench-header-content">
            <div className="workbench-header-row">
              {/* Back button */}
              <Link
                to="/voiceovers"
                className="workbench-back-btn"
                aria-label="Back to voiceovers"
              >
                <ArrowLeftIcon />
              </Link>

              {/* Voiceover icon and title */}
              <div className="workbench-title-group">
                <VoiceoverIcon status={voiceover.status} />
                <div className="min-w-0">
                  <h1 className="workbench-title">{voiceover.title}</h1>
                </div>
              </div>

              {/* Metadata */}
              <div className="workbench-meta">
                {voiceover.duration && (
                  <div className="workbench-duration">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {formatDuration(voiceover.duration)}
                  </div>
                )}

                {/* Approval */}
                <div className="flex items-center gap-3 mr-3">
                  <ApproveButton
                    isApproved={isApproved}
                    isAdmin={isAdmin}
                    onApprove={onApprove}
                    onRevoke={onRevoke}
                    isPending={isApprovalPending}
                  />
                </div>

                {/* Delete button */}
                <div className="workbench-actions">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={!canExport}
                        aria-label="Export voiceover"
                      >
                        <DownloadIcon className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={handleExportAudio}
                        disabled={!canExportAudio}
                      >
                        Download Audio
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleExportScript}
                        disabled={!canExportScript}
                      >
                        Download Script
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleCopyTranscript}
                        disabled={!canExportScript}
                      >
                        Copy Transcript
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDeleteClick}
                    disabled={isDeleting || isGenerating}
                    className="workbench-delete-btn"
                    aria-label="Delete voiceover"
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

        {/* Main content */}
        <div className="workbench-main">
          {rightPanel ? (
            <>
              <div className="workbench-panel-left">
                <div className="workbench-scroll-container">{children}</div>
              </div>
              <aside className="workbench-panel-right flex flex-col">
                {rightPanel}
              </aside>
            </>
          ) : (
            <div className="workbench-scroll-container">{children}</div>
          )}
        </div>

        {/* Global Action Bar */}
        {actionBar}
      </div>
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Voiceover"
        description={`Are you sure you want to delete "${voiceover.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
