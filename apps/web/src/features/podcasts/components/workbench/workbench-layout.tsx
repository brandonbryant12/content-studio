import { ArrowLeftIcon, TrashIcon } from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import type { RouterOutput } from '@repo/api/client';
import type { ReactNode } from 'react';
import { getStatusConfig, isGeneratingStatus } from '../../lib/status';
import { PodcastIcon } from '../podcast-icon';
import { formatDuration } from '@/shared/lib/formatters';

type PodcastFull = RouterOutput['podcasts']['get'];

interface WorkbenchLayoutProps {
  podcast: PodcastFull;
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  actionBar?: ReactNode;
  onDelete: () => void;
  isDeleting: boolean;
}

export function WorkbenchLayout({
  podcast,
  leftPanel,
  rightPanel,
  actionBar,
  onDelete,
  isDeleting,
}: WorkbenchLayoutProps) {
  const statusConfig = getStatusConfig(podcast.status);
  const isGenerating = isGeneratingStatus(podcast.status);

  return (
    <div className="workbench">
      {/* Header */}
      <header className="workbench-header">
        <div className="workbench-header-content">
          <div className="workbench-header-row">
            {/* Back button */}
            <Link
              to="/podcasts"
              className="workbench-back-btn"
              aria-label="Back to podcasts"
            >
              <ArrowLeftIcon />
            </Link>

            {/* Podcast icon and title */}
            <div className="workbench-title-group">
              <PodcastIcon format={podcast.format} status={podcast.status} />
              <div className="min-w-0">
                <h1 className="workbench-title">{podcast.title}</h1>
                {podcast.description && (
                  <p className="workbench-subtitle">{podcast.description}</p>
                )}
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

              {podcast.duration && (
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
                  {formatDuration(podcast.duration)}
                </div>
              )}

              {/* Delete button */}
              <div className="workbench-actions">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  disabled={isDeleting || isGenerating}
                  className="workbench-delete-btn"
                  aria-label="Delete podcast"
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

      {/* Main content - split panels */}
      <div className="workbench-main">
        {/* Left panel - Script */}
        <div className="workbench-panel-left">{leftPanel}</div>

        {/* Right panel - Config */}
        <div className="workbench-panel-right">{rightPanel}</div>
      </div>

      {/* Global Action Bar */}
      {actionBar}
    </div>
  );
}
