import { ArrowLeftIcon, DownloadIcon, TrashIcon } from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { Spinner } from '@repo/ui/components/spinner';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@repo/ui/components/tabs';
import { Link } from '@tanstack/react-router';
import { type ReactNode, useState, useCallback } from 'react';
import type { RouterOutput } from '@repo/api/client';
import { getStatusConfig, isGeneratingStatus } from '../../lib/status';
import { PodcastIcon } from '../podcast-icon';
import { ApproveButton } from '@/shared/components/approval/approve-button';
import { ConfirmationDialog } from '@/shared/components/confirmation-dialog/confirmation-dialog';
import { formatDuration } from '@/shared/lib/formatters';

type PodcastFull = RouterOutput['podcasts']['get'];

interface WorkbenchLayoutProps {
  podcast: PodcastFull;
  tabs: ReadonlyArray<{
    value: string;
    label: string;
    icon: ReactNode;
    content: ReactNode;
  }>;
  audioStrip?: ReactNode;
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
  podcast,
  tabs,
  audioStrip,
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
  const statusConfig = getStatusConfig(podcast.status);
  const isGenerating = isGeneratingStatus(podcast.status);
  const canExport = canExportAudio || canExportScript;
  const handleExportAudio = onExportAudio ?? (() => {});
  const handleExportScript = onExportScript ?? (() => {});
  const handleCopyTranscript = onCopyTranscript ?? (() => {});
  const [activeTab, setActiveTab] = useState(tabs[0]?.value ?? 'script');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const selectedTab = tabs.some((tab) => tab.value === activeTab)
    ? activeTab
    : (tabs[0]?.value ?? 'script');

  const handleDeleteConfirm = useCallback(() => {
    setDeleteConfirmOpen(false);
    onDelete();
  }, [onDelete]);

  return (
    <div className="workbench">
      <header className="workbench-header">
        <div className="workbench-header-content">
          <div className="workbench-header-row">
            <Link
              to="/podcasts"
              className="workbench-back-btn"
              aria-label="Back to podcasts"
            >
              <ArrowLeftIcon />
            </Link>

            <div className="workbench-title-group">
              <PodcastIcon format={podcast.format} status={podcast.status} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="workbench-title">{podcast.title}</h1>
                  {statusConfig && (
                    <Badge
                      variant={statusConfig.badgeVariant}
                      className="shrink-0"
                    >
                      {isGenerating && <Spinner className="w-3 h-3" />}
                      {statusConfig.label}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="workbench-meta">
              {podcast.duration && (
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
                  {formatDuration(podcast.duration)}
                </div>
              )}

              <div className="flex items-center gap-3 mr-3">
                <ApproveButton
                  isApproved={isApproved}
                  isAdmin={isAdmin}
                  onApprove={onApprove}
                  onRevoke={onRevoke}
                  isPending={isApprovalPending}
                />
              </div>

              <div className="workbench-actions">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!canExport}
                      aria-label="Export podcast"
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
                  onClick={() => setDeleteConfirmOpen(true)}
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

      <Tabs
        value={selectedTab}
        onValueChange={setActiveTab}
        className="workbench-v3-tabs-root"
      >
        <TabsList
          className="workbench-v3-tabs flex h-auto flex-wrap justify-start gap-2"
          aria-label="Podcast workbench"
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={`workbench-v3-tab ${selectedTab === tab.value ? 'active' : ''}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="workbench-main">
          {tabs.map((tab) => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="workbench-v3-content flex-1 min-h-0"
            >
              {tab.content}
            </TabsContent>
          ))}
        </div>
      </Tabs>

      {/* Audio player + Action bar — pinned to bottom */}
      {audioStrip && <div className="workbench-audio-strip">{audioStrip}</div>}
      {actionBar}

      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Podcast"
        description={`Are you sure you want to delete "${podcast.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
