import {
  ArrowLeftIcon,
  TrashIcon,
  FileTextIcon,
  MixerHorizontalIcon,
} from '@radix-ui/react-icons';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import { Link } from '@tanstack/react-router';
import { type ReactNode, useState, useCallback } from 'react';
import type { RouterOutput } from '@repo/api/client';
import { getStatusConfig, isGeneratingStatus } from '../../lib/status';
import { ApproveButton } from '@/shared/components/approval/approve-button';
import { PodcastIcon } from '../podcast-icon';
import { formatDuration } from '@/shared/lib/formatters';

type PodcastFull = RouterOutput['podcasts']['get'];
type TabId = 'script' | 'settings';

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
}: WorkbenchLayoutProps) {
  const statusConfig = getStatusConfig(podcast.status);
  const isGenerating = isGeneratingStatus(podcast.status);
  const [activeTab, setActiveTab] = useState<TabId>('script');

  const handleTabClick = useCallback((tab: TabId) => {
    setActiveTab(tab);
  }, []);

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
          <div className="workbench-v3-divider" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={isDeleting || isGenerating}
            className="workbench-v3-delete"
            aria-label="Delete podcast"
          >
            {isDeleting ? <Spinner className="w-4 h-4" /> : <TrashIcon />}
          </Button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav
        className="workbench-v3-tabs"
        role="tablist"
        aria-label="Podcast workbench"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'script'}
          onClick={() => handleTabClick('script')}
          className={`workbench-v3-tab ${activeTab === 'script' ? 'active' : ''}`}
        >
          <FileTextIcon className="w-4 h-4" />
          <span>Script</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'settings'}
          onClick={() => handleTabClick('settings')}
          className={`workbench-v3-tab ${activeTab === 'settings' ? 'active' : ''}`}
        >
          <MixerHorizontalIcon className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </nav>

      <div className="workbench-v3-main">
        {activeTab === 'script' && (
          <div
            className="workbench-v3-content"
            role="tabpanel"
            aria-label="Script"
          >
            {leftPanel}
          </div>
        )}
        {activeTab === 'settings' && (
          <div
            className="workbench-v3-content workbench-v3-settings"
            role="tabpanel"
            aria-label="Settings"
          >
            {rightPanel}
          </div>
        )}
      </div>

      {actionBar}
    </div>
  );
}
