import { ArrowLeftIcon, TrashIcon } from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import type { RouterOutput } from '@repo/api/client';
import type { ReactNode } from 'react';
import { getStatusConfig, isGeneratingStatus } from '../../lib/status';
import { VoiceoverIcon } from '../voiceover-icon';
import { formatDuration } from '@/shared/lib/formatters';

type VoiceoverFull = RouterOutput['voiceovers']['get'];

interface WorkbenchLayoutProps {
  voiceover: VoiceoverFull;
  children: ReactNode; // Main content (simpler than left/right panels)
  actionBar?: ReactNode;
  onDelete: () => void;
  isDeleting: boolean;
  currentUserId: string;
  // Collaborator props (placeholder for Sprint 10)
}

export function WorkbenchLayout({
  voiceover,
  children,
  actionBar,
  onDelete,
  isDeleting,
  currentUserId: _currentUserId,
}: WorkbenchLayoutProps) {
  // currentUserId will be used for collaborator features in Sprint 10
  void _currentUserId;

  const statusConfig = getStatusConfig(voiceover.status);
  const isGenerating = isGeneratingStatus(voiceover.status);

  return (
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

            {/* Status badges and metadata */}
            <div className="workbench-meta">
              {statusConfig && (
                <Badge
                  variant={statusConfig.badgeVariant}
                  className="gap-1.5 px-2.5 py-1 font-medium"
                >
                  {isGenerating && <Spinner className="w-3 h-3" />}
                  {statusConfig.label}
                </Badge>
              )}

              {voiceover.duration && (
                <div className="workbench-duration">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
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

              {/* Collaborator avatars placeholder for Sprint 10 */}
              <div className="flex items-center gap-3 mr-3">
                {/* CollaboratorAvatars will be added here */}
              </div>

              {/* Delete button */}
              <div className="workbench-actions">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
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
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>

      {/* Global Action Bar */}
      {actionBar}
    </div>
  );
}
