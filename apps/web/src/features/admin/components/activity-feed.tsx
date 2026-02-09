import {
  FileTextIcon,
  ImageIcon,
  MixerHorizontalIcon,
  SpeakerLoudIcon,
} from '@radix-ui/react-icons';
import { Button } from '@repo/ui/components/button';
import { Spinner } from '@repo/ui/components/spinner';
import type { ComponentType } from 'react';

interface ActivityItem {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityTitle?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  userName?: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  isLoading: boolean;
}

const ENTITY_ICON: Record<
  string,
  {
    icon: ComponentType<{ className?: string }>;
    bgColor: string;
    textColor: string;
  }
> = {
  document: {
    icon: FileTextIcon,
    bgColor: 'bg-sky-500/10',
    textColor: 'text-sky-600 dark:text-sky-400',
  },
  podcast: {
    icon: MixerHorizontalIcon,
    bgColor: 'bg-violet-500/10',
    textColor: 'text-violet-600 dark:text-violet-400',
  },
  voiceover: {
    icon: SpeakerLoudIcon,
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
  infographic: {
    icon: ImageIcon,
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
};

const ACTION_BADGE: Record<string, { label: string; className: string }> = {
  created: {
    label: 'Created',
    className: 'bg-green-500/10 text-green-700 dark:text-green-400',
  },
  updated: {
    label: 'Updated',
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  },
  deleted: {
    label: 'Deleted',
    className: 'bg-red-500/10 text-red-700 dark:text-red-400',
  },
  generated_script: {
    label: 'Script Generated',
    className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  },
  generated_audio: {
    label: 'Audio Generated',
    className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  },
  generated_voiceover: {
    label: 'Voiceover Generated',
    className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  },
  generated_infographic: {
    label: 'Infographic Generated',
    className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  },
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function ActivityRow({ activity }: { activity: ActivityItem }) {
  const entityConfig = ENTITY_ICON[activity.entityType] ?? {
    icon: FileTextIcon,
    bgColor: 'bg-muted',
    textColor: 'text-muted-foreground',
  };
  const Icon = entityConfig.icon;

  const badge = ACTION_BADGE[activity.action] ?? {
    label: activity.action.replace(/_/g, ' '),
    className: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors">
      {/* Entity icon */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${entityConfig.bgColor}`}
      >
        <Icon
          className={`w-4 h-4 ${entityConfig.textColor}`}
          aria-hidden="true"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">
            {activity.userName ?? 'Unknown user'}
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
          <span className="text-xs text-muted-foreground capitalize">
            {activity.entityType}
          </span>
        </div>
        {activity.entityTitle && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {activity.entityTitle}
          </p>
        )}
      </div>

      {/* Timestamp */}
      <time
        className="text-xs text-muted-foreground shrink-0"
        dateTime={activity.createdAt}
        title={new Date(activity.createdAt).toLocaleString()}
      >
        {formatRelativeTime(activity.createdAt)}
      </time>
    </div>
  );
}

export function ActivityFeed({
  activities,
  hasMore,
  onLoadMore,
  isLoadingMore,
  isLoading,
}: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="loading-center py-12">
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-body">No activity found</p>
        <p className="text-xs text-muted-foreground mt-1">
          Activity will appear here as users create and modify content.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
        {activities.map((activity) => (
          <ActivityRow key={activity.id} activity={activity} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            aria-label="Load more activities"
          >
            {isLoadingMore ? (
              <>
                <Spinner className="w-3.5 h-3.5 mr-2" />
                Loading...
              </>
            ) : (
              'Load more'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
