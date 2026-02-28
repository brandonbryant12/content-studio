import {
  ArrowLeftIcon,
  DownloadIcon,
  TrashIcon,
  FileTextIcon,
  MixerHorizontalIcon,
} from '@radix-ui/react-icons';
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
  leftPanel: ReactNode;
  rightPanel: ReactNode;
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
  leftPanel,
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
  const statusConfig = getStatusConfig(podcast.status);
  const isGenerating = isGeneratingStatus(podcast.status);
  const canExport = canExportAudio || canExportScript;
  const handleExportAudio = onExportAudio ?? (() => {});
  const handleExportScript = onExportScript ?? (() => {});
  const handleCopyTranscript = onCopyTranscript ?? (() => {});
  const [activeTab, setActiveTab] = useState('script');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleDeleteConfirm = useCallback(() => {
    setDeleteConfirmOpen(false);
    onDelete();
  }, [onDelete]);

  return (
    <div className="workbench-v3">
      <header className="workbench-v3-header">
        <div className="workbench-v3-header-left">
          <Link
            to="/podcasts"
            className="workbench-v3-back"
            aria-label="Back to podcasts"
          >
            <ArrowLeftIcon />
          </Link>
          <PodcastIcon format={podcast.format} status={podcast.status} />
          <div className="workbench-v3-title-area">
            <h1 className="workbench-v3-title">{podcast.title}</h1>
            {statusConfig && (
              <Badge
                variant={statusConfig.badgeVariant}
                className="workbench-v3-status"
              >
                {isGenerating && <Spinner className="w-3 h-3" />}
                {statusConfig.label}
              </Badge>
            )}
          </div>
        </div>

        <div className="workbench-v3-header-right">
          {podcast.duration && (
            <span className="workbench-v3-duration">
              {formatDuration(podcast.duration)}
            </span>
          )}
          <ApproveButton
            isApproved={isApproved}
            isAdmin={isAdmin}
            onApprove={onApprove}
            onRevoke={onRevoke}
            isPending={isApprovalPending}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={!canExport}
                aria-label="Export podcast"
              >
                <DownloadIcon />
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
          <div className="workbench-v3-divider" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={isDeleting || isGenerating}
            className="workbench-v3-delete"
            aria-label="Delete podcast"
          >
            {isDeleting ? <Spinner className="w-4 h-4" /> : <TrashIcon />}
          </Button>
        </div>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="workbench-v3-tabs-root"
      >
        <TabsList className="workbench-v3-tabs" aria-label="Podcast workbench">
          <TabsTrigger
            value="script"
            className={`workbench-v3-tab ${activeTab === 'script' ? 'active' : ''}`}
          >
            <FileTextIcon className="w-4 h-4" />
            <span>Script</span>
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className={`workbench-v3-tab ${activeTab === 'settings' ? 'active' : ''}`}
          >
            <MixerHorizontalIcon className="w-4 h-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <div className="workbench-v3-main">
          <TabsContent value="script" className="workbench-v3-content">
            {leftPanel}
          </TabsContent>
          <TabsContent
            value="settings"
            className="workbench-v3-content workbench-v3-settings"
          >
            {rightPanel}
          </TabsContent>
        </div>
      </Tabs>

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
