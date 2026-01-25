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
import { CollaboratorAvatars } from '../collaborators';
import { ApproveButton } from '../collaborators';
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
  currentUserId: string;
  owner: {
    id: string;
    name: string;
    image?: string | null;
    hasApproved: boolean;
  };
  collaborators: readonly {
    id: string;
    podcastId: string;
    userId: string | null;
    email: string;
    userName: string | null;
    userImage: string | null;
    hasApproved: boolean;
  }[];
  currentUserHasApproved: boolean;
  onManageCollaborators: () => void;
}

export function WorkbenchLayout({
  podcast,
  leftPanel,
  rightPanel,
  actionBar,
  onDelete,
  isDeleting,
  currentUserId,
  owner,
  collaborators,
  currentUserHasApproved,
  onManageCollaborators,
}: WorkbenchLayoutProps) {
  const statusConfig = getStatusConfig(podcast.status);
  const isGenerating = isGeneratingStatus(podcast.status);
  const [activeTab, setActiveTab] = useState<TabId>('script');

  const handleTabClick = useCallback((tab: TabId) => {
    setActiveTab(tab);
  }, []);

  return (
    <div className="workbench-v3">
      {/* Header with integrated tabs */}
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
          <CollaboratorAvatars
            owner={owner}
            collaborators={collaborators}
            onManageClick={onManageCollaborators}
          />
          <ApproveButton
            podcastId={podcast.id}
            userId={currentUserId}
            hasApproved={currentUserHasApproved}
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
      <nav className="workbench-v3-tabs">
        <button
          type="button"
          onClick={() => handleTabClick('script')}
          className={`workbench-v3-tab ${activeTab === 'script' ? 'active' : ''}`}
        >
          <FileTextIcon className="w-4 h-4" />
          <span>Script</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabClick('settings')}
          className={`workbench-v3-tab ${activeTab === 'settings' ? 'active' : ''}`}
        >
          <MixerHorizontalIcon className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </nav>

      {/* Main Content Area - Full Width */}
      <div className="workbench-v3-main">
        {activeTab === 'script' && (
          <div className="workbench-v3-content">{leftPanel}</div>
        )}
        {activeTab === 'settings' && (
          <div className="workbench-v3-content workbench-v3-settings">
            {rightPanel}
          </div>
        )}
      </div>

      {/* Action Bar */}
      {actionBar}
    </div>
  );
}
