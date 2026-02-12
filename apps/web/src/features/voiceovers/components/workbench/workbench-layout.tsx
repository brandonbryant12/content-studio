import { ArrowLeftIcon, TrashIcon } from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
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
  actionBar?: ReactNode;
  onDelete: () => void;
  isDeleting: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  onApprove: () => void;
  onRevoke: () => void;
  isApprovalPending: boolean;
}

export function WorkbenchLayout({
  voiceover,
  children,
  actionBar,
  onDelete,
  isDeleting,
  isApproved,
  isAdmin,
  onApprove,
  onRevoke,
  isApprovalPending,
}: WorkbenchLayoutProps) {
  const isGenerating = isGeneratingStatus(voiceover.status);
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

        {/* Main content - single panel (voiceover is simpler than podcast) */}
        <div className="workbench-main">
          <div className="workbench-scroll-container">{children}</div>
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
