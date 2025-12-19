import { ArrowLeftIcon, TrashIcon } from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import type { RouterOutput } from '@repo/api/client';
import { PodcastIcon } from '../podcast-icon';
import { getStatusConfig, isGeneratingStatus } from '../../-constants/status';
import { formatDuration } from '@/lib/formatters';

type PodcastFull = RouterOutput['podcasts']['get'];

interface WorkbenchLayoutProps {
  podcast: PodcastFull;
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  onDelete: () => void;
  isDeleting: boolean;
}

export function WorkbenchLayout({
  podcast,
  leftPanel,
  rightPanel,
  onDelete,
  isDeleting,
}: WorkbenchLayoutProps) {
  const statusConfig = getStatusConfig(podcast.status);
  const isGenerating = isGeneratingStatus(podcast.status);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      {/* Header with subtle gradient */}
      <header className="shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200/80 dark:border-gray-800/80 shadow-sm">
        <div className="px-4 py-4 lg:px-6">
          <div className="flex items-center gap-4">
            {/* Back button */}
            <Link
              to="/podcasts"
              className="group flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
              aria-label="Back to podcasts"
            >
              <ArrowLeftIcon className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors" />
            </Link>

            {/* Podcast icon and title */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <PodcastIcon format={podcast.format} status={podcast.status} />
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50 truncate tracking-tight">
                  {podcast.title}
                </h1>
                {podcast.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {podcast.description}
                  </p>
                )}
              </div>
            </div>

            {/* Status badges and metadata */}
            <div className="flex items-center gap-3">
              <Badge
                variant={statusConfig.badgeVariant}
                className="gap-1.5 px-2.5 py-1 font-medium"
              >
                {isGenerating && <Spinner className="w-3 h-3" />}
                {statusConfig.label}
              </Badge>

              {podcast.duration && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 font-medium tabular-nums">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatDuration(podcast.duration)}
                </div>
              )}

              {/* Delete button */}
              <div className="ml-2 pl-3 border-l border-gray-200 dark:border-gray-700">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  disabled={isDeleting || isGenerating}
                  className="w-9 h-9 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
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
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left panel - Script (main content area) */}
        <div className="flex-1 lg:w-3/5 overflow-hidden bg-white dark:bg-gray-900">
          {leftPanel}
        </div>

        {/* Right panel - Config (sidebar) */}
        <div className="lg:w-2/5 overflow-hidden border-t lg:border-t-0 lg:border-l border-gray-200/80 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-950/50">
          {rightPanel}
        </div>
      </div>
    </div>
  );
}
